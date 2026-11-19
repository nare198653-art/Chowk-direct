
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { WorkerProfile, Location, Job } from '../types';

interface MapViewProps {
  center: Location;
  workers: WorkerProfile[];
  jobs?: Job[];
  onWorkerClick: (worker: WorkerProfile) => void;
  onJobClick?: (job: Job) => void;
}

const MapView: React.FC<MapViewProps> = ({ center, workers, jobs = [], onWorkerClick, onJobClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersGroup = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([center.lat, center.lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMap.current);
      
      markersGroup.current = L.layerGroup().addTo(leafletMap.current);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (leafletMap.current && markersGroup.current) {
      markersGroup.current.clearLayers();

      // Add User location marker
      L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          className: 'bg-blue-500 w-4 h-4 rounded-full border-2 border-white shadow-lg',
          html: '',
          iconSize: [16, 16]
        })
      }).addTo(markersGroup.current);

      // Add Worker markers
      workers.forEach(worker => {
        if (worker.isAvailable) {
          // Add privacy jitter (approximate location)
          // Roughly 100-200 meters jitter
          const jitterLat = (Math.random() - 0.5) * 0.002;
          const jitterLng = (Math.random() - 0.5) * 0.002;
          
          const marker = L.marker([worker.location.lat + jitterLat, worker.location.lng + jitterLng], {
            icon: L.divIcon({
              className: 'relative',
              html: `
                <div class="bg-orange-600 p-2 rounded-full border-2 border-white shadow-xl cursor-pointer">
                   <div class="text-white text-[10px] font-bold">${worker.skill[0]}</div>
                </div>
              `,
              iconSize: [32, 32]
            })
          });
          
          marker.on('click', () => onWorkerClick(worker));
          marker.addTo(markersGroup.current!);
        }
      });

      // Add Job markers
      jobs.forEach(job => {
        if (job.status === 'open') {
          const marker = L.marker([job.location.lat, job.location.lng], {
            icon: L.divIcon({
              className: 'relative',
              html: `
                <div class="bg-slate-900 p-2 rounded-full border-2 border-white shadow-xl cursor-pointer">
                   <div class="text-white text-[10px] font-bold">💼</div>
                </div>
              `,
              iconSize: [32, 32]
            })
          });
          
          if (onJobClick) {
            marker.on('click', () => onJobClick(job));
          }
          marker.addTo(markersGroup.current!);
        }
      });
      
      leafletMap.current.setView([center.lat, center.lng]);
    }
  }, [center, workers, jobs, onWorkerClick, onJobClick]);

  return <div ref={mapRef} className="w-full h-full rounded-xl shadow-inner overflow-hidden" />;
};

export default MapView;
