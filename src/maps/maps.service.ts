import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventStatus } from '@prisma/client';

export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  steps: RouteStep[];
  geometry?: any; // GeoJSON LineString
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver?: string;
  coordinates: [number, number];
}

export interface NearbyEventsResult {
  events: any[];
  distances: Map<string, number>;
}

@Injectable()
export class MapsService {
  private readonly mapboxToken: string;
  private readonly defaultTransportMode = 'driving';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.mapboxToken = this.configService.get('MAPBOX_TOKEN') || '';
  }

  async getNearbyEvents(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 20,
  ): Promise<NearbyEventsResult> {
    const locations = await this.prisma.location.findMany({
      take: limit,
    });

    const distances = new Map<string, number>();

    locations.forEach((loc: any) => {
      const locPoint: Location = { latitude: loc.y, longitude: loc.x };
      const distanceMeters = this.calculateDistance({ latitude, longitude }, locPoint);
      distances.set(String(loc.id), distanceMeters);
    });

    return { events: locations, distances };
  }

  async getRoute(
    origin: Location,
    destination: Location,
    transportMode: 'driving' | 'walking' | 'cycling' | 'transit' = 'driving',
    alternatives = false,
  ): Promise<RouteResult> {
    if (!this.mapboxToken) {
      return this.getStraightLineRoute(origin, destination);
    }

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/${transportMode}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        geometries: 'geojson',
        steps: 'true',
        overview: 'full',
        alternatives: alternatives.toString(),
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry,
          steps: route.legs[0]?.steps?.map((step: any) => ({
            instruction: step.maneuver?.instruction || '',
            distance: step.distance,
            duration: step.duration,
            maneuver: step.maneuver?.type,
            coordinates: step.geometry?.coordinates[0] || [destination.longitude, destination.latitude],
          })) || [],
        };
      }
    } catch (error) {
      console.error('Mapbox routing error:', error);
    }

    return this.getStraightLineRoute(origin, destination);
  }

  async getMultiStopRoute(
    locations: Location[],
    transportMode: 'driving' | 'walking' | 'cycling' = 'driving',
    optimize = true,
  ): Promise<RouteResult> {
    if (!this.mapboxToken || locations.length < 2) {
      return this.getStraightLineMultiStop(locations);
    }

    if (locations.length === 2) {
      return this.getRoute(locations[0], locations[1], transportMode);
    }

    let totalDistance = 0;
    let totalDuration = 0;
    const allSteps: RouteStep[] = [];

    for (let i = 0; i < locations.length - 1; i++) {
      const route = await this.getRoute(locations[i], locations[i + 1], transportMode);
      totalDistance += route.distance;
      totalDuration += route.duration;
      allSteps.push(...route.steps);
    }

    return {
      distance: totalDistance,
      duration: totalDuration,
      steps: allSteps,
    };
  }

  async getEventDirections(eventId: string, userLocation: Location): Promise<RouteResult | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { latitude: true, longitude: true, venueName: true, location: true, address: true },
    });
    if (!event || !event.latitude || !event.longitude) {
      return null;
    }

    const destination: Location = {
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
      name: event.venueName ?? event.location ?? undefined,
      address: event.address ?? undefined,
    };

    return this.getRoute(userLocation, destination);
  }

  async getPublicTransportInfo(origin: Location, destination: Location): Promise<{
    routes: any[];
    estimatedCost?: number;
  }> {
    if (!this.mapboxToken) {
      return { routes: [] };
    }

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/transit/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        geometries: 'geojson',
        steps: 'true',
        overview: 'full',
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      return {
        routes: data.routes || [],
      };
    } catch (error) {
      console.error('Transit routing error:', error);
      return { routes: [] };
    }
  }

  private getStraightLineRoute(origin: Location, destination: Location): RouteResult {
    const distance = this.calculateDistance(origin, destination);
    const duration = distance / 13.89; // Assume 50 km/h average speed

    return {
      distance,
      duration,
      steps: [
        {
          instruction: `Head toward ${destination.name || 'destination'}`,
          distance,
          duration,
          maneuver: 'depart',
          coordinates: [origin.longitude, origin.latitude],
        },
        {
          instruction: `Arrive at ${destination.name || 'destination'}`,
          distance: 0,
          duration: 0,
          maneuver: 'arrive',
          coordinates: [destination.longitude, destination.latitude],
        },
      ],
    };
  }

  private getStraightLineMultiStop(locations: Location[]): RouteResult {
    let totalDistance = 0;
    let totalDuration = 0;
    const allSteps: RouteStep[] = [];

    for (let i = 0; i < locations.length - 1; i++) {
      const distance = this.calculateDistance(locations[i], locations[i + 1]);
      const duration = distance / 13.89;
      totalDistance += distance;
      totalDuration += duration;

      allSteps.push({
        instruction: `Head toward ${locations[i + 1].name || 'next stop'}`,
        distance,
        duration,
        maneuver: i === 0 ? 'depart' : 'continue',
        coordinates: [locations[i].longitude, locations[i].latitude],
      });
    }

    allSteps.push({
      instruction: `Arrive at final destination`,
      distance: 0,
      duration: 0,
      maneuver: 'arrive',
      coordinates: [locations[locations.length - 1].longitude, locations[locations.length - 1].latitude],
    });

    return {
      distance: totalDistance,
      duration: totalDuration,
      steps: allSteps,
    };
  }

  private calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371000; // Earth radius in meters
    const lat1 = (loc1.latitude * Math.PI) / 180;
    const lat2 = (loc2.latitude * Math.PI) / 180;
    const deltaLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const deltaLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async getMapConfig(): Promise<{ token: string; style: string; center: [number, number]; zoom: number }> {
    return {
      token: this.mapboxToken,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.006, 40.7128],
      zoom: 12,
    };
  }
}