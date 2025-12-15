export interface BakuganEntry {
  name: string;
  series: string;
  type: string;
  description: string;
}

export const BAKUGAN_NAMES = [
  "Dragonoid", "Delta Dragonoid", "Ultimate Dragonoid", "Infinity Dragonoid",
  "Hydranoid", "Dual Hydranoid", "Alpha Hydranoid",
  "Tigrerra", "Blade Tigrerra",
  "Gorem", "Hammer Gorem",
  "Preyas", "Preyas Diablo", "Preyas Angelo",
  "Skyress", "Storm Skyress",
  "Reaper", "Fear Ripper", "Siege", "Robotallion", "Saurus", "Mantris",
  "Laserman", "Centipoid", "Rattleoid", "Falconeer", "Stinglash", "Griffon",
  "Warius", "Ravenoid", "Limulus", "Juggernoid", "Terrorclaw", "Serpenoid",
  "Tuskor", "Monarus", "Hynoid", "El Condor", "Garganoid", "Sirenoid",
  "Tentaclear", "Lars Lion", "Wavern", "Naga", "Apollonir", "Clayf",
  "Exedra", "Frosch", "Oberus", "Bee Striker", "Harpus", "Manion",
  "Wormquake", "Fourtress", "Cycloid",
  "Neo Dragonoid", "Cross Dragonoid", "Turbine Dragonoid", "Helix Dragonoid",
  "Viper Helios", "Cyborg Helios", "Helios MK2",
  "Elfin", "Minx Elfin",
  "Nemus", "Saint Nemus",
  "Percival", "Knight Percival", "Midnight Percival",
  "Ingram", "Master Ingram",
  "Wilda", "Magma Wilda", "Thunder Wilda",
  "Vulcan", "Premo Vulcan",
  "Brontes", "Alto Brontes", "Mega Brontes",
  "Altair", "Wired", "Elico", "Blast Elico", "Hades", "Myriad Hades",
  "Verias", "Abis Omega", "Moskeeto", "Klawgor", "Spindle", "Foxbat",
  "Atmos", "Leefram", "Fencer", "Scraper", "Stug", "Freezer",
  "Lumino Dragonoid", "Blitz Dragonoid",
  "Dharak", "Phantom Dharak", "Linehalt", "Coredem", "Akwimos",
  "Hawktor", "Aranaut", "Contestir", "Strikeflier", "Avior", "Sabator",
  "Lumagrowl", "Lythirus", "Krakix", "Phosphos", "Rubanoid", "Plitheon",
  "Snapzoid", "Fangoid", "Spidaro", "Buz Hornix", "Clawsaurus", "Dartaak",
  "Glotronoid", "Gyrazor", "Luxtor", "Merlix", "Ziperator",
  "Titanium Dragonoid", "Fusion Dragonoid", "Mercury Dragonoid",
  "Taylean", "Trister", "Boulderon", "Wolfurio", "Zenthon",
  "Silent Strike", "Accelerak", "Razenoid", "Mutant Helios", "Infinity Helios",
  "Spyron", "Vertexx", "Krakenoid", "Horridian", "Bolcanon", "Slynix", "Mutant Taylean",
].sort();

export const ATTRIBUTES = [
  "Pyrus",
  "Aquos", 
  "Haos",
  "Darkus",
  "Subterra",
  "Ventus",
];

export const G_POWER_OPTIONS = [
  "150G", "200G", "250G", "280G", "300G", "320G", "350G", "380G",
  "400G", "420G", "450G", "480G", "500G", "520G", "550G", "580G",
  "600G", "620G", "650G", "680G", "700G", "750G", "800G", "850G",
  "900G", "950G", "1000G",
];

export const TREATMENTS = [
  "Standard",
  "Translucent",
  "Pearl",
  "Metallic",
  "Special Attack",
  "Flip",
  "Heavy Metal",
  "Diamond",
  "Clear",
  "Dual Attribute",
  "B1 (Original)",
  "B2 (Second Release)",
  "B3 (Third Release)",
  "Japanese Exclusive",
  "Target Exclusive",
  "Toys R Us Exclusive",
];

export const SERIES_OPTIONS = [
  "Battle Brawlers",
  "New Vestroia", 
  "Gundalian Invaders",
  "Mechtanium Surge",
];
