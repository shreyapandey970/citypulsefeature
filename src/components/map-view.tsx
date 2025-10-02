
"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import Image from 'next/image';

import { PotholeIcon } from "@/components/icons/pothole-icon";
import { Trash2, LightbulbOff, TreeDeciduous, Flag } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

type IssueType = 'pothole' | 'garbage' | 'streetlight' | 'fallen_tree' | 'other';
type Status = 'pending' | 'in progress' | 'resolved';

type Complaint = {
    id: string;
    issueType: IssueType;
    location: string;
    severity: 'high' | 'medium' | 'low';
    imageUrl: string;
    status: Status;
};

const getIconHtml = (issueType: IssueType) => {
    const commonStyle: React.CSSProperties = { width: '24px', height: '24px', color: 'white' };
    let icon;
    switch (issueType) {
        case 'pothole': icon = <PotholeIcon style={commonStyle} />; break;
        case 'garbage': icon = <Trash2 style={commonStyle} />; break;
        case 'streetlight': icon = <LightbulbOff style={commonStyle} />; break;
        case 'fallen_tree': icon = <TreeDeciduous style={commonStyle} />; break;
        default: icon = <div style={{...commonStyle, fontSize: '18px', textAlign: 'center'}}>?</div>;
    }
    return renderToStaticMarkup(icon);
}

const getIconColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
        case 'high': return '#ef4444'; // red-500
        case 'medium': return '#f97316'; // orange-500
        default: return '#3b82f6'; // blue-500
    }
};

const createComplaintIcon = (issueType: IssueType, severity: 'high' | 'medium' | 'low') => {
  const iconHtml = `
    <div style="
      background-color: ${getIconColor(severity)};
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    ">
      ${getIconHtml(issueType)}
    </div>
  `;
  return L.divIcon({
    html: iconHtml,
    className: '', // important to clear default styling
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const droppedPinIcon = L.divIcon({
  html: `<div style="font-size: 2.5rem; line-height: 1;">📌</div>`,
  className: '', // important to clear default styling
  iconSize: [40, 40],
  iconAnchor: [20, 40], // Point of the pin
});

const routePointIcon = (label: string) => L.divIcon({
    html: `
        <div style="
            background-color: #4f46e5; 
            color: white; 
            border-radius: 50%; 
            width: 32px; height: 32px; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            font-weight: bold; 
            font-size: 14px;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            ">
            ${label}
        </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});


const MapUpdater = ({ center, route, complaints }: { center?: LatLngExpression, route: LatLngExpression[], complaints: Complaint[] }) => {
    const map = useMap();
    
    useEffect(() => {
        if(center) {
            map.setView(center, map.getZoom() < 13 ? 13 : map.getZoom());
        }
    }, [center, map]);
    
    useEffect(() => {
        const validComplaintPoints = complaints
            .map(c => {
                const parts = c.location.split(',').map(p => p.trim());
                if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
                    return null;
                }
                const [lat, lng] = parts.map(p => parseFloat(p.trim()));
                return [lat, lng] as LatLngExpression;
            })
            .filter(Boolean) as LatLngExpression[];

        let allPoints = [...validComplaintPoints];

        if (Array.isArray(route) && route.length > 0 && Array.isArray(route[0])) {
             allPoints.push(...(route as LatLngExpression[]));
        }

        if (allPoints.length > 0) {
             const bounds = L.latLngBounds(allPoints as L.LatLngBoundsExpression);
             if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
             }
        }
    }, [complaints, route, map]);
    
    return null;
}

const ClickHandler = ({ onClick }: { onClick: (latlng: { lat: number, lng: number }) => void }) => {
    const map = useMap();
    useEffect(() => {
        const handleClick = (e: L.LeafletMouseEvent) => {
            onClick(e.latlng);
        };
        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
        };
    }, [map, onClick]);
    return null;
}

export function MapView({ complaints, route, droppedPin, onMapClick, center }: { complaints: Complaint[], route: LatLngExpression[], droppedPin?: LatLngExpression | null, onMapClick?: (latlng: { lat: number, lng: number }) => void, center?: LatLngExpression }) {
    
    // Fallback for when map container fails to initialize (e.g. in some SSR scenarios or errors)
    if (typeof window === 'undefined') {
        return (
            <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=-0.1,51.5,-0.09,51.51"
                className="h-[500px] w-full rounded-lg"
                title="OpenStreetMap Fallback"
            ></iframe>
        );
    }

    // Reset Leaflet container on mount to prevent duplicate initialization
    useEffect(() => {
      const container = L.DomUtil.get("map");
      if (container != null) {
        (container as any)._leaflet_id = null;
      }
    }, []);
    
    const defaultCenter = center || [20.5937, 78.9629];

    return (
        <MapContainer id="map" center={defaultCenter} zoom={5} scrollWheelZoom={true} className="h-full min-h-[200px] w-full rounded-lg z-0">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater complaints={complaints} route={route} center={center} />
            {onMapClick && <ClickHandler onClick={onMapClick} />}
            
            {route.length > 0 && Array.isArray(route[0]) && (
                <Polyline positions={route as LatLngExpression[]} color="blue" />
            )}

            {route.map((point, index) => {
                const label = index === 0 ? 'A' : 'B';
                 return (
                    <Marker key={index} position={point as LatLngExpression} icon={routePointIcon(label)}>
                        <Popup>
                            {label === 'A' ? 'Start Location' : 'Destination'}
                        </Popup>
                    </Marker>
                 )
            })}
             
            {droppedPin && (
                 <Marker position={droppedPin} icon={droppedPinIcon} />
            )}

            {complaints.map(complaint => {
                const parts = complaint.location.split(',').map(p => p.trim());
                if (parts.length !== 2) return null;

                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);

                if (isNaN(lat) || isNaN(lng)) return null;
                
                const position: LatLngExpression = [lat, lng];

                return (
                    <Marker key={complaint.id} position={position} icon={createComplaintIcon(complaint.issueType, complaint.severity)}>
                        <Popup>
                            <div className="w-48">
                                <h4 className="font-bold capitalize text-base mb-2">{complaint.issueType.replace(/_/g, ' ')}</h4>
                                <Image
                                    src={complaint.imageUrl}
                                    alt={complaint.issueType}
                                    width={192}
                                    height={128}
                                    className="rounded-md object-cover mb-2"
                                />
                                <p><strong>Severity:</strong> <span className="capitalize">{complaint.severity}</span></p>
                                <p><strong>Status:</strong> <span className="capitalize">{complaint.status}</span></p>
                                <p><strong>Location:</strong> {complaint.location}</p>
                            </div>
                        </Popup>
                    </Marker>
                )
            })}
        </MapContainer>
    );
}
