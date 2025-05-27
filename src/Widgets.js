// src/Widget.js
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// Legend Widget
export function LegendWidget() {
  const map = useMap();
  const controlRef = useRef();

  useEffect(() => {
    const control = L.control({ position: "bottomright" });

    control.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control legend");
      div.style.backgroundColor = "white";
      div.style.padding = "10px";
      div.style.borderRadius = "5px";
      div.style.boxShadow = "0 0 15px rgba(0,0,0,0.2)";
      div.innerHTML = `
        <h4>Legend</h4>
        <div>
          <svg width="20" height="20">
            <rect width="20" height="20" fill="#a6d8ff" stroke="#0066cc" stroke-width="2"/>
          </svg> Ward Boundaries
        </div>
        <div style="margin-top:5px;">
          <img src="/icons/school.png" alt="School Icon" width="20" height="20" style="vertical-align:middle;"/>
          Schools
        </div>
      `;
      return div;
    };

    control.addTo(map);
    controlRef.current = control;

    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return null;
}

// Home Button Widget
export function HomeButton({ center, zoom }) {
  const map = useMap();
  const controlRef = useRef();

  useEffect(() => {
    const control = L.control({ position: "topleft" });

    control.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control-layers leaflet-bar");
      div.innerHTML = '<button title="Home">🏠</button>';
      div.style.cursor = "pointer";
      div.style.width = "34px";
      div.style.height = "34px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.onclick = () => {
        map.setView(center, zoom);
      };
      return div;
    };

    control.addTo(map);
    controlRef.current = control;

    return () => {
      map.removeControl(control);
    };
  }, [map, center, zoom]);

  return null;
}
