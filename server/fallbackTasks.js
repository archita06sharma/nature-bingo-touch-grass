/**
 * Curated Fallback Challenge Set for Nature Bingo — Touch Grass
 * Handcrafted by field naturalists to ensure safe, universally accessible,
 * environmentally responsible exploration in any urban park, backyard, or trail.
 */

const FALLBACK_TASKS = [
  // 1-5: FLORA (Plant life, leaves, bark, seeds)
  {
    id: "task-1",
    title: "Serrated Leaf Edge",
    description: "Locate a fallen or living leaf with saw-tooth (serrated) edges. Observe the pattern of veins leading to the teeth.",
    category: "flora",
    difficulty: "easy",
    verificationType: "PHOTO",
    safetyTip: "Observe without picking live leaves whenever possible. Do not touch plants with three oily leaves."
  },
  {
    id: "task-2",
    title: "Tree Bark Texture Study",
    description: "Find an established tree and examine the bark furrow pattern, lichen growth, or sap traces up close.",
    category: "flora",
    difficulty: "easy",
    verificationType: "PHOTO",
    safetyTip: "Do not peel or carve into living bark."
  },
  {
    id: "task-3",
    title: "Airborne Seed Pod or Cone",
    description: "Find a fallen seed designed for wind dispersal (like a pine cone, dandelion tuft, or maple helicopter seed).",
    category: "flora",
    difficulty: "medium",
    verificationType: "PHOTO",
    safetyTip: "Keep your eyes open along footpaths; avoid venturing into thick brush."
  },
  {
    id: "task-4",
    title: "Moss Microhabitat",
    description: "Spot a patch of moss growing on stone, damp soil, or the shady base of a tree trunk.",
    category: "flora",
    difficulty: "easy",
    verificationType: "PHOTO",
    safetyTip: "Avoid stepping on delicate moss beds; take photos from trail edges."
  },
  {
    id: "task-5",
    title: "Native Wildflower or Bud",
    description: "Discover a wild blossom, floral bud, or roadside flower blooming in its natural setting.",
    category: "flora",
    difficulty: "medium",
    verificationType: "PHOTO",
    safetyTip: "Leave flowers for pollinators to feed on; do not harvest or disturb root systems."
  },

  // 6-10: FAUNA (Insects, birds, animal signs)
  {
    id: "task-6",
    title: "Bird Song Identification",
    description: "Pause and record or identify a wild bird calling or singing from nearby branches.",
    category: "fauna",
    difficulty: "medium",
    verificationType: "AUDIO",
    safetyTip: "Stay still and do not play artificial bird distress calls to avoid stressing wildlife."
  },
  {
    id: "task-7",
    title: "Insect at Work",
    description: "Observe an ant trail, pollinating bee, beetle, or dragonfly engaged in daily activity.",
    category: "fauna",
    difficulty: "easy",
    verificationType: "TIME",
    durationSeconds: 45,
    safetyTip: "Maintain a respectful distance. Never attempt to handle stinging or unfamiliar insects."
  },
  {
    id: "task-8",
    title: "Feather or Animal Track",
    description: "Spot a naturally molted feather on the ground or animal footprints pressed into soft mud or sand.",
    category: "fauna",
    difficulty: "hard",
    verificationType: "PHOTO",
    safetyTip: "Wash your hands after outdoor sessions; leave molted feathers where they lie."
  },
  {
    id: "task-9",
    title: "Squirrel or Small Forager",
    description: "Spot a squirrel, chipmunk, lizard, or small creature searching for food or perching in vegetation.",
    category: "fauna",
    difficulty: "easy",
    verificationType: "HONOR",
    safetyTip: "Never offer human food to wild animals; it disrupts their natural diet and habits."
  },
  {
    id: "task-10",
    title: "Spider Silk or Dew Web",
    description: "Look for an intricate spider web glistening between branches, fence rails, or tall grasses.",
    category: "fauna",
    difficulty: "medium",
    verificationType: "PHOTO",
    safetyTip: "Observe from a distance without walking through or breaking the spider's web."
  },

  // 11-15: SENSORY (Sounds, scents, textures, mindfulness)
  {
    id: "task-11",
    title: "One-Minute Silence Meditation",
    description: "Close your eyes for 60 seconds. Count how many distinct layers of natural sound you can hear.",
    category: "sensory",
    difficulty: "easy",
    verificationType: "TIME",
    durationSeconds: 60,
    safetyTip: "Find a stable, safe spot away from vehicular traffic and bicycle paths."
  },
  {
    id: "task-12",
    title: "Wind in the Canopy",
    description: "Record the ambient rustle of wind moving through tree leaves, tall dry grasses, or reeds.",
    category: "sensory",
    difficulty: "easy",
    verificationType: "AUDIO",
    safetyTip: "Be mindful of dead overhanging branches (widowmakers) during windy days."
  },
  {
    id: "task-13",
    title: "Earth Aroma (Petrichor / Pine)",
    description: "Smell crushed pine needles on the ground, fresh damp soil, or the scent of rain on dry ground.",
    category: "sensory",
    difficulty: "easy",
    verificationType: "HONOR",
    safetyTip: "Gently smell from a safe distance; never inhale powdery molds, spores, or unknown fungi."
  },
  {
    id: "task-14",
    title: "Two Contrasting Textures",
    description: "Touch a smooth river rock or pebble, then touch a rough tree bark or dry acorn cap. Notice the contrast.",
    category: "sensory",
    difficulty: "easy",
    verificationType: "HONOR",
    safetyTip: "Examine surfaces with your eyes first before touching to ensure no stinging nettles or thorns."
  },
  {
    id: "task-15",
    title: "Natural Soundscape Recording",
    description: "Capture a 10-15 second audio snippet of natural ambient sounds free from mechanical motor noise.",
    category: "sensory",
    difficulty: "medium",
    verificationType: "AUDIO",
    safetyTip: "Choose a quiet corner of the park or outdoor space."
  },

  // 16-20: EARTH (Geology, soil, stone, water)
  {
    id: "task-16",
    title: "Layered or Speckled Rock",
    description: "Find a natural stone displaying distinct mineral bands, quartz veins, or speckled grain patterns.",
    category: "earth",
    difficulty: "medium",
    verificationType: "PHOTO",
    safetyTip: "Leave stones in place—moving large rocks disrupts shelter for salamanders and insects."
  },
  {
    id: "task-17",
    title: "Water Ripple or Dewdrop",
    description: "Find a pool of water with gentle wind ripples, a morning dewdrop resting on a leaf, or a stream eddy.",
    category: "earth",
    difficulty: "easy",
    verificationType: "PHOTO",
    safetyTip: "Stay on safe, dry shores; avoid slippery wet river banks and steep inclines."
  },
  {
    id: "task-18",
    title: "Decomposing Fallen Log",
    description: "Locate a nurse log or decaying wood returning nutrients to the soil. Notice fungus or moss colonies.",
    category: "earth",
    difficulty: "easy",
    verificationType: "PHOTO",
    safetyTip: "Do not kick or break apart decaying wood; it is a critical nursery habitat."
  },
  {
    id: "task-19",
    title: "Natural Geographic Landmark",
    description: "Log your GPS position at an outdoor geographic feature like a hill crest, creek bend, or trail crossing.",
    category: "earth",
    difficulty: "medium",
    verificationType: "GPS",
    safetyTip: "Stick to recognized public trails and always inform someone when visiting larger parks."
  },
  {
    id: "task-20",
    title: "Erosion or Soil Pattern",
    description: "Observe where rainwater has carved gentle grooves in earth or where tree roots anchor the topsoil.",
    category: "earth",
    difficulty: "medium",
    verificationType: "PHOTO",
    safetyTip: "Walk gently on footpaths to avoid worsening soil erosion."
  },

  // 21-25: SKY (Atmosphere, sun, clouds, shadows)
  {
    id: "task-21",
    title: "Cloud Formation Study",
    description: "Look upward and identify the cloud type (cumulus, stratus, cirrus) or the clear open sky gradient.",
    category: "sky",
    difficulty: "easy",
    verificationType: "PHOTO",
    safetyTip: "Never stare directly into the sun while photographing or observing the sky."
  },
  {
    id: "task-22",
    title: "Dynamic Leaf Shadow",
    description: "Find an artistic shadow pattern cast by swaying leaves onto a footpath, bench, or stone wall.",
    category: "sky",
    difficulty: "easy",
    verificationType: "PHOTO",
    safetyTip: "Stay aware of other walkers and cyclists sharing the path."
  },
  {
    id: "task-23",
    title: "Two-Minute Sky Watch",
    description: "Sit down comfortably and observe the motion of the sky and tree crowns for a full 120 seconds.",
    category: "sky",
    difficulty: "medium",
    verificationType: "TIME",
    durationSeconds: 120,
    safetyTip: "Rest in the shade during peak heat hours and stay hydrated."
  },
  {
    id: "task-24",
    title: "Compass Direction of the Sun",
    description: "Determine the cardinal direction (North, South, East, West) of the sun based on shadow orientation.",
    category: "sky",
    difficulty: "medium",
    verificationType: "HONOR",
    safetyTip: "Use shadow orientation rather than looking at the sun."
  },
  {
    id: "task-25",
    title: "Open Horizon GPS Waypoint",
    description: "Record your coordinates at an open-sky vantage point with a wide view of the surrounding landscape.",
    category: "sky",
    difficulty: "medium",
    verificationType: "GPS",
    safetyTip: "Ensure your feet are securely on flat ground; stay behind railings at viewpoints."
  }
];

module.exports = {
  FALLBACK_TASKS
};
