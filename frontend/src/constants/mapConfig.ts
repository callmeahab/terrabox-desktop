export const INITIAL_VIEW_STATE = {
  longitude: -105.4,
  latitude: 40.8,
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

export const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoiY2FsbG1lYWhhYiIsImEiOiJjamlxNHJtaGoxNDBnM3FudzR5dDY5aWFtIn0.hq8FE2soHGLnmgUmU-89tg";

export const MAP_STYLES = [
  {
    name: "Streets",
    url: "mapbox://styles/mapbox/streets-v12",
  },
  {
    name: "Hybrid",
    url: "mapbox://styles/mapbox/satellite-streets-v12",
  },
  {
    name: "Dark",
    url: "mapbox://styles/mapbox/dark-v11",
  },
  {
    name: "Light",
    url: "mapbox://styles/mapbox/light-v11",
  },
];
