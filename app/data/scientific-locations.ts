export type ScientificPhoto = { src: string; caption: string; credit: string };

export type ScientificLocation = {
  id: string;
  name: string;
  lat: number; // degrees north
  lon: number; // degrees east
  type: string;
  about: string;
  geology: string;
  importance: string;
  photos: ScientificPhoto[];
};

export const scientificLocations: ScientificLocation[] = [
  {
    id: "landing-site",
    name: "Octavia E. Butler Landing Site",
    lat: 18.4446,
    lon: 77.4509,
    type: "Landing site",
    about:
      "Where NASA's Perseverance rover touched down on 18 February 2021, inside Jezero Crater (about 45 km wide). The site is named after the science fiction author Octavia E. Butler.",
    geology:
      "Flat crater floor made of dark igneous (volcanic) rock, with scattered rocks and sand ripples.",
    importance:
      "The flat, safe terrain made the landing possible, and several science targets are within reach.",
    photos: [
      { src: "/photos/landing-site-1.jpg", caption: "Rock on the Jezero crater floor (Mastcam-Z, Sol 2024)", credit: "NASA/JPL-Caltech/ASU" },
      { src: "/photos/landing-site-2.jpg", caption: "Jezero crater floor terrain (Perseverance raw image)", credit: "NASA/JPL-Caltech/ASU" },
      { src: "/photos/landing-site-3.jpg", caption: "Jezero crater floor terrain (Perseverance raw image)", credit: "NASA/JPL-Caltech/ASU" },
    ],
  },
  {
    id: "jezero-delta",
    name: "Jezero Delta",
    lat: 18.46,
    lon: 77.38,
    type: "Ancient river delta",
    about:
      "A fan-shaped deposit on the western edge of Jezero Crater, built where a river once flowed into a lake. Perseverance explored it after studying the crater floor.",
    geology:
      "Layered sediments (sandstone, mudstone) deposited by flowing water.",
    importance:
      "Fine-grained delta sediments are among the best places to preserve signs of ancient microbial life.",
    photos: [],
  },
  {
    id: "seitah",
    name: "Séítah",
    lat: 18.4,
    lon: 77.4,
    type: "Crater floor unit",
    about:
      "A geological unit on the crater floor. The name comes from Navajo and means roughly 'amidst the sand'.",
    geology: "Olivine-rich igneous rock, layered and partly altered by water.",
    importance:
      "Helps scientists understand the early volcanic history of Jezero and how water changed these rocks.",
    photos: [],
  },
  {
    id: "maaz",
    name: "Máaz Formation",
    lat: 18.43,
    lon: 77.43,
    type: "Crater floor unit",
    about:
      "The unit Perseverance first drove across after landing. 'Máaz' is the Navajo word for Mars.",
    geology: "Igneous rocks covering the crater floor, rich in pyroxene.",
    importance: "Used to compare the crater floor rocks with Séítah and to study the crater's history.",
    photos: [],
  },
  {
    id: "neretva-vallis",
    name: "Neretva Vallis",
    lat: 18.5,
    lon: 77.1,
    type: "River channel",
    about:
      "An ancient valley on the western side of Jezero that carried water into the crater lake. It is named after the Neretva River in the Balkans.",
    geology: "Valley carved by flowing water, with deposits spreading into the crater.",
    importance:
      "Shows where water and sediment entered the lake, which explains how the delta formed.",
    photos: [],
  },
  {
    id: "nili-fossae",
    name: "Nili Fossae",
    lat: 21.0,
    lon: 74.5,
    type: "Carbonate-rich region",
    about:
      "A region of long troughs northwest of Isidis Planitia, close to Jezero. It is one of the places where clays, olivine and carbonates were found from orbit.",
    geology: "Ancient crust with clays, olivine and carbonate minerals.",
    importance:
      "Carbonates can preserve traces of past water and organic material. It is a target for future exploration.",
    photos: [],
  },
];