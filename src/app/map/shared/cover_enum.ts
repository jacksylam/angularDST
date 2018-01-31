export const COVER_ENUM = 
Object.freeze({
    // "Alien Forest": 0,
    // "Alien Forest in Fog Zone": 1,
    // "Fallow/Grassland": 2,
    // "Grassland": 3,
    // "Kiawe/Phreatophytes": 4,
    // "Low-Intensity Developed": 5,
    // "Native Forest": 6,
    // "Native Forest in Fog Zone": 7,
    // "Near-Coastal or Estuarine Water Body": 8,
    // "Open-Space Developed": 9,
    // "Predevelopment Grass/Shrub": 10,
    // "Predevelopment Open Native Forest": 11,
    // "Reservoirs": 12,
    // "Shrub Land": 13,
    // "Sparsely Vegetated, Barren": 14,
    // "Sugurcane - Unirrigated": 15,
    // "Taro": 16,
    // "Tree Plantatation": 17,
    // "Tree Plantation in Fog Zone": 18,
    // "Water Body": 19,
    // "WetLand": 20,

    // "Coffee": 21,
    // "Corn": 22,
    // "Developed, Medium-Intensity": 23,
    // "Developed, High-Intensity": 24,
    // "Diversified Agriculture": 25,
    // "Golf Course": 26,
    // "Macadamia": 27,
    // "Pineapple": 28,
    // "Sugarcane - Drop Irrigation": 29,
    // "Sugarcane - Furrow Irrigation": 30

    "AlienForest": {
        number: 3,
        palette: ["#ffffff", "#000000", "#000000"]
    },
    "AlienForestFog": {
        number: 4,
        palette: ["#ff0000", "#5b0101", "#5b0101"]
    },
    //? what does this correspond to ? might be one of the removed ones ?
    "Fallow": {
        number: 11,
        palette: ["#0000ff", "#000660", "#000660"]
    },
    "Grassland": {
        number: 7,
        palette: ["#00ff00", "#075e00", "#075e00"]
    },
    "Kiawe": {
        number: 5,
        palette: ["#ff00e9", "#600058", "#600058"]
    },
    "LowIntensity": {
        number: 8,
        palette: ["#ffe500", "#00466d", "#00466d"]
    },
    "Native": {
        number: 1,
        palette: ["#5b0101", "#595000", "#595000"]
    }
});


//Need irrigated/non-irrigated separation?
export const COVER_INDEX_DETAILS = 
Object.freeze({
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
        "type": 	"Wetland",
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
        "type": "NA",
        "color": "red"
    },
    18: {
        "type": "NA",
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
})