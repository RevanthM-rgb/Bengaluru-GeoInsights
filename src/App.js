import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import osmtogeojson from "osmtogeojson";
import MarkerClusterGroup from "react-leaflet-cluster";
import CustomSearch from "./CustomSearch";
import { LegendWidget, HomeButton } from "./Widgets";
import "./App.css";

// Basemaps
const basemaps = {
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  },
  topo: {
    name: "Topographic",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  esri: {
    name: "ESRI Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, Earthstar Geographics",
  },
  dark: {
    name: "CartoDB Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
  },
};

// Basemap Widget
function BasemapWidget({ current, onChange }) {
  const map = useMap();
  const widgetRef = useRef();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const control = L.control({ position: "topleft" });

    control.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control-layers leaflet-bar");
      div.innerHTML = '<button title="Basemap Gallery">🌐</button>';
      div.style.cursor = "pointer";
      div.style.width = "34px";
      div.style.height = "34px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.onclick = () => setVisible((v) => !v);
      return div;
    };

    control.addTo(map);
    widgetRef.current = control;

    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return visible ? (
    <div className="basemap-popup leaflet-control">
      {Object.entries(basemaps).map(([key, layer]) => (
        <div
          key={key}
          className={`basemap-option ${key === current ? "selected" : ""}`}
          onClick={() => {
            onChange(key);
            setVisible(false);
          }}
        >
          {layer.name}
        </div>
      ))}
    </div>
  ) : null;
}

// Bookmarks Widget
function BookmarksWidget() {
  const map = useMap();
  const controlRef = useRef();
  const [visible, setVisible] = useState(false);

  const bookmarks = [
    {
      name: "Majestic",
      center: [12.9763, 77.5714],
      zoom: 15,
    },
    {
      name: "MG Road",
      center: [12.9750, 77.6050],
      zoom: 15,
    },
    {
      name: "Indiranagar",
      center: [12.9719, 77.6412],
      zoom: 14,
    },
    {
      name: "Jayanagar",
      center: [12.9250, 77.5938],
      zoom: 14,
    },
    {
      name: "Whitefield",
      center: [12.9698, 77.7499],
      zoom: 13,
    },
  ];

  useEffect(() => {
    const control = L.control({ position: "topright" });

    control.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control-layers leaflet-bar");
      div.innerHTML = '<button title="Bookmarks">🔖</button>';
      div.style.cursor = "pointer";
      div.style.width = "34px";
      div.style.height = "34px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.onclick = () => setVisible((v) => !v);
      return div;
    };

    control.addTo(map);
    controlRef.current = control;

    return () => {
      map.removeControl(control);
    };
  }, [map]);

  if (!visible) return null;

  return (
    <div className="layerlist-popup leaflet-control" style={{ top: "40px", right: "50px" }}>
      {bookmarks.map((bm, index) => (
        <div
          key={index}
          className="layerlist-option"
          onClick={() => {
            map.setView(bm.center, bm.zoom);
            setVisible(false);
          }}
        >
          {bm.name}
        </div>
      ))}
    </div>
  );
}

// Ward Layer
function WardLayer({ visible, wardData, openPopupFeature }) {
  const geoJsonRef = useRef();

  const style = {
    color: "#0066cc",
    weight: 2,
    fillColor: "#a6d8ff",
    fillOpacity: 0.3,
  };

  const highlight = {
    weight: 3,
    color: "#003366",
    fillOpacity: 0.5,
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    const popupContent = `
      <strong>Ward Name:</strong> ${props.KGISWardName || "N/A"}<br/>
      <strong>Ward No:</strong> ${props.KGISWardNo || "N/A"}<br/>
      <strong>KGIS Ward Code:</strong> ${props.KGISWardCode || "N/A"}<br/>
      <strong>LGD Ward Code:</strong> ${props.LGD_WardCode || "N/A"}<br/>
      <strong>Town Code:</strong> ${props.KGISTownCode || "N/A"}
    `;
    layer.on({
      mouseover: (e) => e.target.setStyle(highlight),
      mouseout: (e) => e.target.setStyle(style),
      click: (e) => {
        layer.bindPopup(popupContent).openPopup(e.latlng);
      },
    });
  };

  useEffect(() => {
    if (openPopupFeature && geoJsonRef.current) {
      geoJsonRef.current.eachLayer((layer) => {
        if (
          layer.feature &&
          layer.feature.properties?.KGISWardName ===
            openPopupFeature.properties?.KGISWardName
        ) {
          const center = layer.getBounds().getCenter();
          const props = layer.feature.properties || {};
          const popupContent = `
            <strong>Ward Name:</strong> ${props.KGISWardName || "N/A"}<br/>
            <strong>Ward No:</strong> ${props.KGISWardNo || "N/A"}<br/>
            <strong>KGIS Ward Code:</strong> ${props.KGISWardCode || "N/A"}<br/>
            <strong>LGD Ward Code:</strong> ${props.LGD_WardCode || "N/A"}<br/>
            <strong>Town Code:</strong> ${props.KGISTownCode || "N/A"}
          `;
          layer.bindPopup(popupContent).openPopup(center);
        }
      });
    }
  }, [openPopupFeature]);

  if (!visible || !wardData) return null;

  return (
    <GeoJSON
      data={wardData}
      style={style}
      onEachFeature={onEachFeature}
      ref={geoJsonRef}
    />
  );
}

// School Layer
function SchoolLayer({ visible, schoolData, openPopupFeature }) {
  const markersRef = useRef({});

  const schoolIcon = L.icon({
    iconUrl: "/icons/school.png",
    iconSize: [25, 25],
    iconAnchor: [12, 24],
    popupAnchor: [0, -20],
  });

  useEffect(() => {
    if (openPopupFeature && markersRef.current) {
      Object.values(markersRef.current).forEach((marker) => {
        marker.closePopup();
      });
      const key = openPopupFeature.__key;
      const marker = markersRef.current[key];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [openPopupFeature]);

  if (!visible || !schoolData) return null;

  return (
    <MarkerClusterGroup chunkedLoading>
      {schoolData.features.map((feature, idx) => {
        const coords = feature.geometry?.coordinates;
        if (!coords || feature.geometry?.type !== "Point" || coords.length !== 2)
          return null;

        const [lng, lat] = coords;

        const name =
          feature.properties?.tags?.name ||
          feature.properties?.name ||
          "Unnamed School";

        feature.__key = idx;

        return (
          <Marker
            key={idx}
            position={[lat, lng]}
            icon={schoolIcon}
            ref={(ref) => {
              if (ref) {
                markersRef.current[idx] = ref;
              }
            }}
          >
            <Popup>
              <strong>School:</strong> {name}
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}

// Layer List Widget
function LayerListWidget({ layers, toggleLayer }) {
  const map = useMap();
  const controlRef = useRef();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const control = L.control({ position: "topright" });

    control.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control-layers leaflet-bar");
      div.innerHTML = '<button title="Layers List">📋</button>';
      div.style.cursor = "pointer";
      div.style.width = "34px";
      div.style.height = "34px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.onclick = () => setVisible((v) => !v);
      return div;
    };

    control.addTo(map);
    controlRef.current = control;

    return () => {
      map.removeControl(control);
    };
  }, [map]);

  if (!visible) return null;

  return (
    <div className="layerlist-popup leaflet-control" style={{ top: "40px", right: "10px" }}>
      {layers.map(({ id, name, visible }) => (
        <div key={id} className="layerlist-option">
          <input
            type="checkbox"
            checked={visible}
            id={`layer-${id}`}
            onChange={() => toggleLayer(id)}
          />
          <label htmlFor={`layer-${id}`}>{name}</label>
        </div>
      ))}
    </div>
  );
}

// Scale Widget
function ScaleWidget() {
  const map = useMap();
  const controlRef = useRef();

  useEffect(() => {
    const scaleControl = L.control.scale({
      position: "bottomleft",
      metric: true,
      imperial: false,
      maxWidth: 150,
    });

    scaleControl.addTo(map);
    controlRef.current = scaleControl;

    return () => {
      map.removeControl(scaleControl);
    };
  }, [map]);

  return null;
}

// Main App Component
export default function App() {
  const [basemap, setBasemap] = useState("osm");
  const [layersVisibility, setLayersVisibility] = useState({
    ward: false,
    schools: true,
  });

  const [wardData, setWardData] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [openPopupFeature, setOpenPopupFeature] = useState(null);

  const initialCenter = [12.9716, 77.5946];
  const initialZoom = 12;

  useEffect(() => {
    fetch("/data/ward-boundaries.geojson")
      .then((res) => res.json())
      .then(setWardData);
  }, []);

  useEffect(() => {
    if (!layersVisibility.schools) {
      setSchoolData(null);
      return;
    }

    const overpassQuery = `
      [out:json];
      area["name"="Bengaluru"]["admin_level"=8]->.searchArea;
      (
        node["amenity"="school"](area.searchArea);
        way["amenity"="school"](area.searchArea);
        relation["amenity"="school"](area.searchArea);
      );
      out body;
      >;
      out skel qt;
    `;

    const fetchSchools = async () => {
      try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: overpassQuery,
        });
        const json = await res.json();
        const geojson = osmtogeojson(json);
        setSchoolData(geojson);
      } catch (error) {
        console.error("Error fetching schools:", error);
      }
    };

    fetchSchools();
  }, [layersVisibility.schools]);

  const toggleLayer = (layerId) => {
    setLayersVisibility((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));

    if (
      (layerId === "ward" &&
        openPopupFeature?.properties?.KGISWardName) ||
      (layerId === "schools" &&
        openPopupFeature?.geometry?.type === "Point")
    ) {
      setOpenPopupFeature(null);
    }
  };

  const layers = [
    { id: "ward", name: "Ward Boundaries", visible: layersVisibility.ward },
    { id: "schools", name: "Schools", visible: layersVisibility.schools },
  ];

  return (
    <>
      <header className="app-header">
        <img
          src="https://cdn-icons-png.flaticon.com/512/854/854866.png"
          alt="Geo Icon"
          className="logo"
        />
        <h1>Bengaluru GeoInsights</h1>
      </header>

      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={true}
        style={{ height: "calc(100vh - 60px)", width: "100%" }}
      >
        <TileLayer
          attribution={basemaps[basemap].attribution}
          url={basemaps[basemap].url}
        />

        <WardLayer
          visible={layersVisibility.ward}
          wardData={wardData}
          openPopupFeature={
            openPopupFeature?.properties?.KGISWardName ? openPopupFeature : null
          }
        />
        <SchoolLayer
          visible={layersVisibility.schools}
          schoolData={schoolData}
          openPopupFeature={
            openPopupFeature?.geometry?.type === "Point" ? openPopupFeature : null
          }
        />

        <BasemapWidget current={basemap} onChange={setBasemap} />
        <LayerListWidget layers={layers} toggleLayer={toggleLayer} />
        <BookmarksWidget />
        <CustomSearch
          wardsData={wardData}
          schoolsData={schoolData}
          onSelectFeature={setOpenPopupFeature}
        />

        <ScaleWidget />
        <LegendWidget />
        <HomeButton center={initialCenter} zoom={initialZoom} />
      </MapContainer>
    </>
  );
}
