/*
 * Coaster Coast: shared dataset
 *
 * Attendance: TEA/AECOM Global Experience Index, North America top 20
 * amusement and theme parks, 2021 to 2024 (published 2025).
 * Ride specs: park operator listings and Wikipedia ride pages, checked
 * October 2026. minHeight is in inches (0 means no minimum height).
 * topSpeed is in mph and is null for rides that are not speed rated.
 */
(function () {
  "use strict";

  var OPERATORS = {
    disney: { id: "disney", name: "Walt Disney World" },
    universal: { id: "universal", name: "Universal Orlando" },
    united: { id: "united", name: "United Parks (SeaWorld and Busch Gardens)" }
  };

  var PARKS = [
    { id: "mk",  name: "Magic Kingdom",              operator: "disney",    city: "Lake Buena Vista", opened: 1971 },
    { id: "ep",  name: "EPCOT",                      operator: "disney",    city: "Lake Buena Vista", opened: 1982 },
    { id: "hs",  name: "Disney's Hollywood Studios", operator: "disney",    city: "Lake Buena Vista", opened: 1989 },
    { id: "ak",  name: "Disney's Animal Kingdom",    operator: "disney",    city: "Lake Buena Vista", opened: 1998 },
    { id: "usf", name: "Universal Studios Florida",  operator: "universal", city: "Orlando",          opened: 1990 },
    { id: "ioa", name: "Islands of Adventure",       operator: "universal", city: "Orlando",          opened: 1999 },
    { id: "eu",  name: "Epic Universe",              operator: "universal", city: "Orlando",          opened: 2025 },
    { id: "swo", name: "SeaWorld Orlando",           operator: "united",    city: "Orlando",          opened: 1973 },
    { id: "bgt", name: "Busch Gardens Tampa Bay",    operator: "united",    city: "Tampa",            opened: 1959 }
  ];

  /* Annual visitors. Epic Universe opened in 2025, so it has no rows yet. */
  var ATTENDANCE_YEARS = [2021, 2022, 2023, 2024];
  var ATTENDANCE = {
    mk:  [12691000, 17133000, 17720000, 17836000],
    ep:  [7752000,  10000000, 11980000, 12133000],
    hs:  [8589000,  10900000, 10300000, 10333000],
    ak:  [7194000,  9027000,  8770000,  8800000],
    usf: [8987000,  10750000, 9750000,  9500000],
    ioa: [9077000,  11025000, 10000000, 9450000],
    swo: [3051000,  4454000,  4342000,  4347000],
    bgt: [3210000,  4051000,  4000000,  3975000]
  };

  /* Combined 2024 attendance of all 20 parks in the North America index. */
  var NA_TOP20_TOTAL_2024 = 144001000;

  var RIDE_TYPES = [
    "Roller coaster",
    "Launched coaster",
    "Dark ride",
    "Flight simulator",
    "Drop ride",
    "Water ride",
    "Slot car ride"
  ];

  var RIDES = [
    { id: "r01", name: "TRON Lightcycle / Run", park: "mk", type: "Launched coaster", minHeight: 48, opened: 2023, topSpeed: 59.3,
      notes: "Riders lean forward on lightcycle seats and launch out under an illuminated canopy." },
    { id: "r02", name: "Seven Dwarfs Mine Train", park: "mk", type: "Roller coaster", minHeight: 38, opened: 2014, topSpeed: 34,
      notes: "A family coaster with swinging mine cars and a ride past the dwarfs' cottage." },
    { id: "r03", name: "Space Mountain", park: "mk", type: "Roller coaster", minHeight: 44, opened: 1975, topSpeed: 27,
      notes: "The original indoor coaster in near darkness. It feels much faster than it is." },
    { id: "r04", name: "Big Thunder Mountain Railroad", park: "mk", type: "Roller coaster", minHeight: 38, opened: 1980, topSpeed: 35,
      notes: "Reopened in May 2026 with new track and a lower 38 inch minimum." },
    { id: "r05", name: "Guardians of the Galaxy: Cosmic Rewind", park: "ep", type: "Roller coaster", minHeight: 42, opened: 2022, topSpeed: 60,
      notes: "Vehicles rotate to face the action, set to a randomly chosen 1970s and 80s track." },
    { id: "r06", name: "Test Track", park: "ep", type: "Slot car ride", minHeight: 40, opened: 1999, topSpeed: 65,
      notes: "Ends with an outdoor high speed loop around the pavilion. Reimagined version opened in July 2025." },
    { id: "r07", name: "Remy's Ratatouille Adventure", park: "ep", type: "Dark ride", minHeight: 0, opened: 2021, topSpeed: null,
      notes: "A trackless 3D ride through Gusteau's kitchen at rat scale. Good for every age." },
    { id: "r08", name: "Star Wars: Rise of the Resistance", park: "hs", type: "Dark ride", minHeight: 40, opened: 2019, topSpeed: null,
      notes: "A long, multi part attraction that ends in an escape from a Star Destroyer." },
    { id: "r09", name: "Slinky Dog Dash", park: "hs", type: "Launched coaster", minHeight: 38, opened: 2018, topSpeed: 40,
      notes: "Two gentle launches through Andy's backyard. A first big coaster for many kids." },
    { id: "r10", name: "The Twilight Zone Tower of Terror", park: "hs", type: "Drop ride", minHeight: 40, opened: 1994, topSpeed: null,
      notes: "A haunted hotel elevator with randomized drop sequences and a view over the park." },
    { id: "r11", name: "Avatar Flight of Passage", park: "ak", type: "Flight simulator", minHeight: 44, opened: 2017, topSpeed: null,
      notes: "A 3D banshee flight over Pandora on motorbike style seats." },
    { id: "r12", name: "Expedition Everest", park: "ak", type: "Roller coaster", minHeight: 44, opened: 2006, topSpeed: 50,
      notes: "Runs forward and backward through the Himalayas before meeting the yeti." },
    { id: "r13", name: "Na'vi River Journey", park: "ak", type: "Water ride", minHeight: 0, opened: 2017, topSpeed: null,
      notes: "A calm boat ride through a glowing rainforest. No height minimum." },
    { id: "r14", name: "Revenge of the Mummy", park: "usf", type: "Launched coaster", minHeight: 48, opened: 2004, topSpeed: 40,
      notes: "An indoor coaster that mixes dark ride scenes, fire effects and a backward section." },
    { id: "r15", name: "Harry Potter and the Escape from Gringotts", park: "usf", type: "Launched coaster", minHeight: 42, opened: 2014, topSpeed: null,
      notes: "A 3D coaster and dark ride hybrid inside the Gringotts bank vaults." },
    { id: "r16", name: "Jurassic World VelociCoaster", park: "ioa", type: "Launched coaster", minHeight: 51, opened: 2021, topSpeed: 70,
      notes: "Two launches, a 155 foot top hat and four inversions over the lagoon." },
    { id: "r17", name: "Hagrid's Magical Creatures Motorbike Adventure", park: "ioa", type: "Launched coaster", minHeight: 48, opened: 2019, topSpeed: 50,
      notes: "A story coaster with seven launches, a backward section and a free fall drop." },
    { id: "r18", name: "The Incredible Hulk Coaster", park: "ioa", type: "Launched coaster", minHeight: 54, opened: 1999, topSpeed: 67,
      notes: "Launches uphill into a zero g roll right at the start. Rebuilt in 2016." },
    { id: "r19", name: "Stardust Racers", park: "eu", type: "Roller coaster", minHeight: 48, opened: 2025, topSpeed: 62,
      notes: "A dueling coaster whose two tracks race and cross through the Celestial Spin." },
    { id: "r20", name: "Mako", park: "swo", type: "Roller coaster", minHeight: 54, opened: 2016, topSpeed: 73,
      notes: "Orlando's tallest coaster at 200 feet, built for long stretches of airtime." },
    { id: "r21", name: "Pipeline: The Surf Coaster", park: "swo", type: "Launched coaster", minHeight: 54, opened: 2023, topSpeed: 60,
      notes: "A stand up launched coaster on surfboard style seats." },
    { id: "r22", name: "Kraken", park: "swo", type: "Roller coaster", minHeight: 54, opened: 2000, topSpeed: 65,
      notes: "A floorless coaster with seven inversions and three underground tunnels." },
    { id: "r23", name: "Manta", park: "swo", type: "Roller coaster", minHeight: 54, opened: 2009, topSpeed: 56,
      notes: "A flying coaster that holds riders face down and skims the water." },
    { id: "r24", name: "Iron Gwazi", park: "bgt", type: "Roller coaster", minHeight: 48, opened: 2022, topSpeed: 76,
      notes: "A 206 foot hybrid coaster and the fastest ride in Florida." },
    { id: "r25", name: "SheiKra", park: "bgt", type: "Roller coaster", minHeight: 54, opened: 2005, topSpeed: 70,
      notes: "A dive coaster that pauses over a 90 degree, 200 foot drop." },
    { id: "r26", name: "Montu", park: "bgt", type: "Roller coaster", minHeight: 54, opened: 1996, topSpeed: 60,
      notes: "An inverted coaster with seven inversions. Still a fan favorite after thirty years." },
    { id: "r27", name: "Phoenix Rising", park: "bgt", type: "Roller coaster", minHeight: 42, opened: 2024, topSpeed: 44,
      notes: "A family inverted coaster with sweeping views across the park." }
  ];

  window.CoasterData = Object.freeze({
    OPERATORS: OPERATORS,
    PARKS: PARKS,
    ATTENDANCE_YEARS: ATTENDANCE_YEARS,
    ATTENDANCE: ATTENDANCE,
    NA_TOP20_TOTAL_2024: NA_TOP20_TOTAL_2024,
    RIDE_TYPES: RIDE_TYPES,
    RIDES: RIDES
  });
})();
