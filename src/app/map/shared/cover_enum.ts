export const COVER_ENUM = 
Object.freeze({
    "Background" : 0,
    "Native Forest" : 1,
    "Native Forest Fog" : 2,
    "Alien Forest" : 3,
    "Alien Forest Fog" : 4,
    "Kiawe/Phreatophytes" : 5,
    "Shrubland" : 6,
    "Grassland" : 7,
    "Developed Low-Intensity" : 8,
    "Developed Medium-Intensity" : 9,
    "Developed High-Intensity" : 10,
    "Sparsely Vegetated" : 11,
    "Wetland" : 12,
    "Water Body" : 13,
    "Reservoirs" : 14,
    "Golf Course" : 15,
    "Pineapple" : 16,
    "Sugarcane (furrow)" : 17,
    "Sugarcane (drip)" : 18,
    "Sugarcane 1870" : 19,
    //"Pineapple" : 20,
    "Corn" : 21,
    "Coffee" : 22,
    "Macadamia" : 23,
    "Diversified Agriculture" : 24,
    "Tree Plantation" : 25,
    "Taro" : 26,
    "Grass Shrub 1870" : 27,
    "Open Native Forest Grass Shrub 1870" : 28,
    "Sparse Grassland 1870" : 29,
    "Near-Coastal or Estuarine Water Body" : 30

    // "AlienForest": ["#ffffff", "#000000", "#000000"],
    // "AlienForestFog": ["#ff0000", "#5b0101", "#5b0101"],
    // "Fallow": ["#0000ff", "#000660", "#000660"],
    // "Grassland": ["#00ff00", "#075e00", "#075e00"],
    // "Kiawe": ["#ff00e9", "#600058", "#600058"],
    // "LowIntensity": ["#ffe500", "#00466d", "#00466d"],
    // "Native": ["#5b0101", "#595000", "#595000"]
});

export var LC_TO_BUTTON_INDEX = {
    1: 7,
    2: 8,
    3: 0,
    4: 1,
    5: 5,
    6: 12,
    7: 4,
    8: 2,
    9: 23,
    10: 22,
    11: 14,
    12: 18,
    13: 17,
    14: 11,
    15: 25,
    16: 26,
    17: 28,
    18: 27,
    19: 15,
    20: 30, //unused
    21: 21,
    22: 20,
    23: 6,
    24: 24,
    25: 16,
    26: 29,
    27: 3,
    28: 10,
    29: 13,
    30: 9,

}

//Need irrigated/non-irrigated separation?
export var COVER_INDEX_DETAILS = {
    0: {
        "type": "Background",
        "color": "red"
    },
    1: {
        "type": "Native Forest",
        "color": "red"
    },
    2: {
        "type": "Native Forest Fog",
        "color": "red"
    },
    3: {
        "type": "Alien Forest",
        "color": "red"
    },
    4: {
        "type": "Alien Forest Fog",
        "color": "red"
    },
    5: {
        "type": "Kiawe/Phreatophytes",
        "color": "red"
    },
    6: {
        "type": "Shrubland",
        "color": "red"
    },
    7: {
        "type": "Grassland",
        "color": "red"
    },
    8: {
        "type": "Developed Low-Intensity",
        "color": "red"
    },
    9: {
        "type": "Developed Medium-Intensity",
        "color": "red"
    },
    10: {
        "type": "Developed High-Intensity",
        "color": "red"
    },
    11: {
        "type": "Sparsely Vegetated",
        "color": "red"
    },
    12: {
        "type": "Wetland",
        "color": "red"
    },
    13: {
        "type": "Water Body",
        "color": "red"
    },
    14: {
        "type": "Reservoirs",
        "color": "red"
    },
    15: {
        "type": "Golf Course",
        "color": "red"
    },
    16: {
        "type": "Pineapple",
        "color": "red"
    },
    17: {
        "type": "Sugarcane (furrow)",
        "color": "red"
    },
    18: {
        "type": "Sugarcane (drip)",
        "color": "red"
    },
    19: {
        "type": "Sugarcane 1870",
        "color": "red"
    },
    20: {
        "type": "Pineapple",
        "color": "red"
    },
    21: {
        "type": "Corn",
        "color": "red"
    },
    22: {
        "type": "Coffee",
        "color": "red"
    },
    23: {
        "type": "Macadamia",
        "color": "red"
    },
    24: {
        "type": "Diversified Agriculture",
        "color": "red"
    },
    25: {
        "type": "Tree Plantation",
        "color": "red"
    },
    26: {
        "type": "Taro",
        "color": "red"
    },
    27: {
        "type": "Grass Shrub 1870",
        "color": "red"
    },
    28: {
        "type": "Open Native Forest Grass Shrub 1870",
        "color": "red"
    },
    29: {
        "type": "Sparse Grassland 1870",
        "color": "red"
    },
    30: {
        "type": "Near-Coastal or Estuarine Water Body",
        "color": "red"
    }
}