import { searchVehicles, formatResults } from "./vehicles-lookup.js";

// Busca por marca + modelo
const ka = searchVehicles("Ford Ka");
console.log("=== Ford Ka ===");
console.log(formatResults(ka));

// Busca por ano
const veiculos2020 = searchVehicles("Fiat 2020");
console.log("\n=== Fiat 2020 ===");
console.log(formatResults(veiculos2020));

// Busca por modelo específico
const toro = searchVehicles("Toro");
console.log("\n=== Toro ===");
console.log(formatResults(toro));
