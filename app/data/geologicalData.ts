
export interface GeologicalFormation {
  id: string;
  name: string;
  category: string;
  description: string;
  composition: string[];
  characteristics: string[];
  scientificImportance: string;
  color: string;

  // Scientific provenance
  source: string;
  sourceName: string;
  dataOrigin: string;
  instruments: string[];
  mappedUnits: string[];
  interpretationNote: string;
}

export const GEOLOGICAL_FORMATIONS: GeologicalFormation[] = [
  {
    id: "maaz",
    name: "Máaz Formation",
    category: "Igneous formation",

    description:
      "An igneous geological formation on the floor of Jezero Crater, studied by NASA's Perseverance rover.",

    composition: [
      "Pyroxene",
      "Plagioclase"
    ],

    characteristics: [
      "Contains five identified geological members",
      "Shows different rock textures and layering",
      "Some outcrops display flow-like morphologies",
      "Its rocks are interpreted as igneous"
    ],

    scientificImportance:
      "Helps scientists investigate the volcanic and magmatic history of Jezero Crater and understand how its crater floor formed.",

    color: "#B87545",

    source:
      "https://ntrs.nasa.gov/api/citations/20230016428/downloads/Bell%20et%20al%202022sciadv.pdf",

    sourceName:
      "Bell et al. (2022) - Geological, multispectral, and meteorological imaging results",

    dataOrigin:
      "Scientific observations collected by NASA's Perseverance rover and published in a NASA-hosted research paper.",

    instruments: [
      "Mastcam-Z",
      "SuperCam"
    ],

    mappedUnits: [
      "Ch'al member",
      "Naat'áanii member",
      "Rochette member",
      "Artuby member",
      "Roubion member"
    ],

    interpretationNote:
      "Máaz is interpreted as an igneous formation, probably representing a series of lava flows. Its mineralogy is dominated by pyroxene and plagioclase."
  },

  {
    id: "seitah",
    name: "Séítah Formation",
    category: "Igneous formation",

    description:
      "An igneous formation on the floor of Jezero Crater. Perseverance observations revealed olivine-rich rocks with coarse crystalline textures.",

    composition: [
      "Olivine",
      "Pyroxene",
      "Plagioclase",
      "Iron, chromium and titanium oxides"
    ],

    characteristics: [
      "Contains two identified geological members",
      "Coarse-grained crystalline rocks",
      "Olivine-rich outcrops",
      "Shows evidence of magmatic differentiation"
    ],

    scientificImportance:
      "Provides evidence about the ancient magmatic history of Mars and helps scientists understand how igneous rocks formed and cooled inside Jezero Crater.",

    color: "#8B78C8",

    source:
      "https://doi.org/10.1029/2022JE007638",

    sourceName:
      "Beyssac et al. (2023) - Petrological Traverse of the Olivine Cumulate Séítah Formation",

    dataOrigin:
      "Mineralogical, chemical and imaging observations collected by the SuperCam instrument aboard NASA's Perseverance rover.",

    instruments: [
      "SuperCam"
    ],

    mappedUnits: [
      "Content member",
      "Bastide member"
    ],

    interpretationNote:
      "Séítah contains olivine-rich igneous rocks. The Bastide member is interpreted as an olivine-rich cumulate formed through the crystallization of magma."
  },

  {
    id: "jezero-delta",
    name: "Jezero Delta Deposits",
    category: "Sedimentary deposit",

    description:
      "A fan-shaped sedimentary deposit formed where an ancient river flowed into Jezero Crater's lake and deposited sand and mud.",

    composition: [
      "Sandstone",
      "Mudstone",
      "Fine-grained sediments"
    ],

    characteristics: [
      "Fan-shaped delta structure",
      "Contains layered sedimentary rocks",
      "Records ancient river and lake environments",
      "Includes fine-grained deposits that may preserve biosignatures"
    ],

    scientificImportance:
      "The delta is a major target of the Perseverance mission because its sedimentary rocks may preserve evidence of ancient habitable environments and possible signs of past microbial life.",

    color: "#4C9A91",

    source:
      "https://science.nasa.gov/resource/perseverance-explores-the-jezero-crater-delta/",

    sourceName:
      "NASA Science - Perseverance Explores the Jezero Crater Delta",

    dataOrigin:
      "NASA Perseverance rover imagery and scientific observations of sedimentary deposits in Jezero Crater.",

    instruments: [
      "Mastcam-Z"
    ],

    mappedUnits: [
      "Jezero Delta",
      "Shenandoah formation (informal name for a studied sedimentary sequence)"
    ],

    interpretationNote:
      "The delta records sediment deposition by an ancient river entering a lake. NASA observations identify sandstone and mudstone deposits in this region."
  }
];
