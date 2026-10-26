/**
 * sample-unit.js
 * ---------------------------------------------------------------------------
 * A finished example of the Weekly Lesson Generator's output, shown when the
 * page cannot reach an AI service (for example the public GitHub Pages copy
 * of the demo, which runs outside Claude).
 *
 * It is adapted from the unit "Grade 8 Geology Week: Rocks and Minerals"
 * (five 30-minute lessons, readings, worksheets, quiz, answer keys, sources
 * and accuracy notes) and rewritten for one homeschool learner: the sample
 * child "Juniper" (Grade 8, long attention span, ADHD, interests in horses,
 * sketching and mystery novels).
 *
 * The object has exactly the shape LessonGenerator.generate() returns, so
 * the page renders it with the same code as a live result.
 * ---------------------------------------------------------------------------
 */
(function attachSampleUnit(root) {
  "use strict";

  const CK12 = "CK-12 Earth Science for Middle School (Brainard and Sandeen, CK-12 Foundation, 2011)";

  const SAMPLE_UNIT = {
    id: "sample-geology-week",
    createdAt: "2026-10-26T12:00:00.000Z",
    mode: "sample",
    childId: "juniper",
    childNick: "Juniper",
    gradeLabel: "Grade 8",
    durationLabel: "1 week",
    lessonMinutes: 30,
    references: [{ kind: "text", title: CK12 + ", Chapters 3 and 4", url: "", content: "" }],
    status: "ready",
    units: [
      {
        subject: "Science",
        topic: "Rocks and minerals",
        title: "Rocks and Minerals",
        subtitle: "A one-week geology unit",
        overview:
          "This week Juniper learns what minerals are, how geologists identify them, how the three families of rock form, and how the rock cycle connects them. Each day follows the same 30-minute rhythm: a short warm-up, a focused reading with discussion, a hands-on or worksheet activity, and a quick exit ticket.",
        goals: [
          "Use the five defining characteristics of a mineral to decide whether a material is a mineral.",
          "Identify minerals using streak, luster, hardness, cleavage or fracture, density and special properties, and explain why color alone is unreliable.",
          "Explain how igneous, sedimentary and metamorphic rocks form, and classify common examples of each.",
          "Connect crystal size in igneous rock to cooling rate, and use the law of superposition to order sedimentary layers.",
          "Develop and use a model of the rock cycle that shows how Earth materials move between rock types and which energy sources drive each process.",
        ],
        materials: [
          "Each day's reading, worksheet and exit ticket (exit tickets can be index cards).",
          "Optional mineral kit: any 4 to 6 common minerals (quartz, calcite, pyrite, hematite, magnetite, talc, fluorite, galena are ideal).",
          "Optional testing tools: unglazed porcelain tile (the rough back of a bathroom tile works), a copper coin, a steel nail, a glass plate with taped edges, a small magnet, a hand lens.",
          "Optional rock samples: granite, basalt, obsidian, pumice, sandstone, shale, conglomerate, limestone, marble, slate, gneiss.",
          "Day 3 optional demo: a clear jar with a lid, a cup of mixed gravel, sand and soil, and water.",
        ],
        safetyNote:
          "Never taste mineral samples, even halite. Broken minerals and glass plates can be sharp: tape glass edges and test hardness on a table, pushing away from the body. If you test calcite with dilute acid, the parent handles the acid and everyone wears goggles.",
        misconceptions: [
          "\"Rocks never change.\" Rocks change constantly, just very slowly.",
          "\"Metamorphic rocks form by melting.\" Metamorphism happens in the solid state; melting leads to igneous rock.",
          "\"Shiny and gold colored means gold.\" Color is unreliable; use streak and hardness.",
          "\"Every rock goes igneous, then sedimentary, then metamorphic.\" The rock cycle can follow many paths.",
        ],
        hasQuiz: true,
        standards: {
          framework: "New Jersey Student Learning Standards for Science (NJSLS-S, based on NGSS)",
          items: [
            { code: "MS-ESS2-1", text: "Develop a model to describe the cycling of Earth's materials and the flow of energy that drives this process.", where: "Lessons 2 to 5 (rock cycle model on Lessons 4 and 5)" },
            { code: "MS-ESS3-1", text: "Construct a scientific explanation based on evidence for how the uneven distributions of Earth's mineral, energy, and groundwater resources are the result of past and current geoscience processes.", where: "Lesson 1 (how minerals form and where they collect); partial" },
            { code: "MS-ESS1-4", text: "Construct a scientific explanation based on evidence from rock strata for how the geologic time scale is used to organize Earth's 4.6-billion-year-old history.", where: "Lesson 3 (law of superposition); introductory" },
          ],
          practices: "Developing and using models; analyzing and interpreting data; constructing explanations.",
          gaps: [],
        },
        lessons: [
          {
            n: 1, dayLabel: "Mon, Oct 26",
            title: "What Is a Mineral?",
            summary: "Juniper learns the five characteristics every mineral shares and the tests geologists use to identify minerals.",
            bigQuestion: "What makes something a mineral, and how can we tell minerals apart?",
            objectives: ["Decide whether a material is a mineral using the five characteristics.", "Identify a mineral from its streak, luster, hardness and breakage, and explain why color alone is unreliable."],
            vocabulary: ["mineral", "inorganic", "crystal", "streak", "luster", "Mohs hardness scale", "cleavage", "fracture", "density"],
            materials: "Lesson 1 reading; Worksheet 1; exit ticket. Optional: table salt and a hand lens, mineral kit, streak tile, copper coin, steel nail, magnet.",
            reference: CK12 + ", Lessons 3.1, 3.2 and 3.3",
            segments: [
              { time: "0:00 to 0:04", name: "Warm-up", activity: "Ask: \"Halite (rock salt), graphite (pencil 'lead'), and window glass: which are minerals?\" Juniper picks and jots one reason. Don't give the answer yet." },
              { time: "0:04 to 0:14", name: "Reading and discussion", activity: "Read \"What Is a Mineral?\" together. Pause after the five-point checklist to test the warm-up items. Pause after the Mohs scale: \"Your fingernail scratches a mineral. What do you know about its hardness?\" (less than 2.5)" },
              { time: "0:14 to 0:26", name: "Worksheet 1: Mineral Detective", activity: "Part A: apply the checklist to eight materials. Part B: use the identification table to name six mystery minerals. With a mineral kit, test real samples instead." },
              { time: "0:26 to 0:30", name: "Exit ticket", activity: "Return to the warm-up: halite and graphite are minerals; glass is not. Then Juniper answers the exit ticket." },
            ],
            exitTicket: "Pyrite and gold are both a shiny gold color. Name one test that would tell them apart, and describe the result you would expect for each mineral.",
            differentiation: { support: "Give Juniper the five-point checklist as a bookmark and do Part B together.", challenge: "Why are diamond and graphite, both pure carbon, so different? (Their carbon atoms are arranged in different crystal structures.)" },
            adaptations: ["ADHD: the worksheet is split into two short parts with a quick check-in between them.", "Interests: Part B is framed as a mystery to solve, one clue at a time."],
            reading: {
              title: "What Is a Mineral?",
              sections: [
                { heading: "", paragraphs: ["You use minerals every day. The salt on your fries is the mineral **halite**. The \"lead\" in your pencil is made from the mineral **graphite** mixed with clay. Phone screens are made with silica from the mineral **quartz**. Minerals are the natural building blocks of rocks, and almost every rock on Earth is made of one or more of them."], bullets: [] },
                { heading: "The five-point mineral checklist", paragraphs: ["Geologists define a **mineral** as a naturally occurring, inorganic solid with a definite chemical composition and an orderly crystal structure. To count as a mineral, a material must pass all five checks:"], bullets: [
                  "Naturally occurring: it formed through natural processes, not in a factory or lab. A lab-grown diamond is called synthetic, not a mineral.",
                  "Inorganic: it did not form from the remains of living things. Coal forms from ancient plant remains, so coal is not a mineral.",
                  "Solid: it keeps its own shape where it is found. Ice in a glacier is a mineral; liquid water is not.",
                  "Definite chemical composition: it is made of specific elements in a fixed ratio. Quartz is always SiO₂, one silicon atom for every two oxygen atoms.",
                  "Crystal structure: its atoms are arranged in a regular, repeating pattern. Halite's atoms form cubes. Volcanic glass (obsidian) has no pattern, so it is not a mineral.",
                ] },
                { heading: "Where minerals come from", paragraphs: ["Scientists have named more than 6,000 minerals, but only a few dozen are common. The **silicates**, built from silicon and oxygen, make up roughly 90 percent of Earth's crust. Minerals form as magma or lava cools, when salty water evaporates, and when hot water deposits them in underground cracks. Because these processes happen only in certain places, valuable minerals are spread unevenly across Earth, which is why mines are where they are."], bullets: [] },
                { heading: "How do geologists identify minerals?", paragraphs: ["No single test works for every mineral, so geologists use several properties together."], bullets: [
                  "**Color** is easy to see but is the least reliable property. Impurities change it: quartz can be clear, white, pink or purple.",
                  "**Streak** is the color of a mineral's powder on an unglazed porcelain tile. Pyrite leaves a greenish-black streak; real gold leaves a golden-yellow one.",
                  "**Luster** is how a surface reflects light: metallic (pyrite, galena) or nonmetallic, such as glassy (quartz), pearly (talc) or earthy (clay).",
                  "**Hardness** is resistance to scratching, compared on the Mohs scale from talc (1) to diamond (10). A harder mineral scratches a softer one.",
                  "**Cleavage** means splitting along flat surfaces (mica peels into sheets, halite breaks into cubes). **Fracture** means breaking unevenly; quartz breaks with curved, shell-like surfaces.",
                  "**Density** compares mass to volume. Galena (about 7.5 g/cm³) feels far heavier than quartz (about 2.65 g/cm³).",
                  "Special properties: magnetite is attracted to a magnet, calcite fizzes in dilute acid, and many fluorite samples glow under UV light.",
                ] },
                { heading: "The Mohs scale is an order, not equal steps", paragraphs: ["Friedrich Mohs ranked ten minerals in 1812: talc 1, gypsum 2, calcite 3, fluorite 4, apatite 5, orthoclase feldspar 6, quartz 7, topaz 8, corundum 9, diamond 10. Everyday tools stand in: a fingernail is about 2.5, a copper coin about 3 to 3.5, a steel nail or window glass about 5.5. Diamond is far more than ten times harder than talc."], bullets: [] },
              ],
              keyIdeas: ["A mineral is a naturally occurring, inorganic solid with a definite chemical composition and a crystal structure.", "Streak, luster, hardness, cleavage or fracture, density and special properties are used together. Color alone can fool you."],
            },
            worksheet: {
              title: "Worksheet 1: Mineral Detective",
              instructions: "Use the five-point checklist and the identification clues from today's reading.",
              parts: [
                { heading: "Part A: Mineral or not?", instructions: "Write Yes or No. If No, name the check it fails.", items: ["1. A gold nugget found in a stream", "2. Liquid water in a lake", "3. Ice in a glacier", "4. A diamond grown in a laboratory", "5. A lump of coal", "6. Obsidian (natural volcanic glass)", "7. A quartz crystal inside a geode", "8. A plastic water bottle"] },
                { heading: "Part B: Name that mineral", instructions: "Name each mystery mineral and the clue that helped most.", items: ["A. Dark silver-gray and metallic. Reddish-brown streak. Scratches glass, but quartz scratches it.", "B. Brassy yellow and metallic. Greenish-black streak. Scratches glass.", "C. Purple and glassy. Scratches glass and a steel nail. Breaks with curved surfaces.", "D. White and glassy. A steel nail scratches it easily. Breaks into slanted boxes and fizzes in dilute acid.", "E. Lead-gray and metallic. Breaks into perfect cubes and feels very heavy. A copper coin scratches it.", "F. Black and metallic. Black streak. Jumps toward a magnet."] },
                { heading: "Part C: Think like a geologist", instructions: "", items: ["9. A mystery mineral scratches fluorite, but orthoclase feldspar scratches it. What is its approximate hardness? Name an index mineral with that hardness.", "10. A friend says, \"This rock is gold because it is shiny and gold colored.\" Explain why color is not enough, and describe a better test."] },
              ],
            },
            answerKey: {
              worksheet: [
                "Part A. 1. Yes. 2. No (not solid). 3. Yes. 4. No (not naturally occurring; synthetic). 5. No (organic: formed from plant remains; also lacks a definite composition). 6. No (no crystal structure; volcanic glass). 7. Yes. 8. No (not natural; made in a factory from organic materials).",
                "Part B. A. Hematite (reddish-brown streak). B. Pyrite (greenish-black streak). C. Quartz (hardness 7, curved fracture). D. Calcite (fizzes in acid; breaks into slanted boxes; hardness 3). E. Galena (cubic cleavage, high density). F. Magnetite (magnetic).",
                "Part C. 9. Between 4 and 6, about 5; apatite has a hardness of 5. 10. Different minerals can share a color, and impurities change color. A streak test is better: gold streaks golden yellow, pyrite greenish-black. Hardness also works: pyrite scratches glass, gold does not.",
              ],
              exitTicket: "Streak test: pyrite greenish-black, gold golden yellow. Also acceptable: hardness (pyrite, 6 to 6.5, scratches glass; gold, 2.5 to 3, is scratched by a steel nail) or density (gold is far heavier).",
            },
          },
          {
            n: 2, dayLabel: "Tue, Oct 27",
            title: "Igneous Rocks: Born from Fire",
            summary: "Juniper meets the three rock families, then discovers how cooling speed controls the texture of igneous rock.",
            bigQuestion: "How does the speed of cooling shape an igneous rock?",
            objectives: ["Explain the difference between a rock and a mineral.", "Explain how cooling rate controls crystal size.", "Classify igneous rocks by texture (coarse, fine, glassy, bubbly) and color (light or dark)."],
            vocabulary: ["rock", "igneous", "magma", "lava", "intrusive", "extrusive", "texture", "felsic", "mafic"],
            materials: "Lesson 2 reading; Worksheet 2; exit ticket. Optional: granite, basalt, obsidian and pumice samples, a hand lens, a bowl of water to float pumice.",
            reference: CK12 + ", Lessons 4.1 and 4.2",
            segments: [
              { time: "0:00 to 0:04", name: "Warm-up", activity: "Show granite. \"Granite contains quartz, feldspar and mica. Is granite a mineral?\" (No: it is a rock, a mixture of minerals.)" },
              { time: "0:04 to 0:14", name: "Reading and discussion", activity: "Read \"Igneous Rocks: Born from Fire.\" Sketch two boxes, \"deep underground\" and \"at the surface\"; Juniper says which gets big crystals and why. If you have pumice, drop it in water." },
              { time: "0:14 to 0:26", name: "Worksheet 2: Igneous Rock ID", activity: "Classify six igneous rocks by texture and color, then explain crystal size using evidence." },
              { time: "0:26 to 0:30", name: "Exit ticket", activity: "Juniper answers the exit ticket." },
            ],
            exitTicket: "Obsidian and granite can have nearly the same chemical makeup. Explain why they look so different.",
            differentiation: { support: "Use a two-column organizer, \"cooled slowly underground\" and \"cooled quickly at the surface,\" to sort rock names during the reading.", challenge: "Explain how a porphyritic rock could have both large and tiny crystals." },
            adaptations: ["ADHD: the sketching task gives a hands-on break in the middle of the reading.", "Interests: Juniper sketches what each rock looks like under a hand lens, like a field notebook."],
            reading: {
              title: "Igneous Rocks: Born from Fire",
              sections: [
                { heading: "Rocks versus minerals", paragraphs: ["A **rock** is a naturally formed solid mixture of one or more minerals (some rocks also contain volcanic glass or once-living material). If minerals are like letters, rocks are like the words built from them. Granite is a rock made mostly of quartz, feldspar and mica. Geologists sort rocks into three families based on how they formed:"], bullets: ["Igneous rocks form when melted rock cools and hardens.", "Sedimentary rocks form when pieces of other rocks, or minerals that come out of water, are pressed and cemented together.", "Metamorphic rocks form when an existing rock is changed by heat, pressure or hot fluids without melting."] },
                { heading: "Magma and lava", paragraphs: ["**Igneous** comes from the Latin word for fire. Melted rock below the surface is **magma**; when it reaches the surface, for example in an eruption, it is **lava**. As it cools, mineral crystals grow, and the result is igneous rock."], bullets: [] },
                { heading: "Cooling speed controls crystal size", paragraphs: ["The longer the cooling takes, the larger the crystals can grow. **Intrusive** rock cools slowly underground, insulated by the rock around it, so it has large, visible crystals: granite, diorite, gabbro. **Extrusive** rock cools quickly at or near the surface, so it has tiny crystals or none at all: rhyolite, andesite, basalt, obsidian, pumice.", "Obsidian cooled so fast that atoms had no time to line up into crystals, so it is natural volcanic glass. Pumice formed from gas-rich lava that frothed like a shaken soda; it is full of tiny holes and often floats. A porphyritic rock has large crystals in a fine-grained background: it began cooling slowly underground, then finished quickly after it erupted."], bullets: [] },
                { heading: "Color gives clues about composition", paragraphs: ["**Felsic** rocks are rich in feldspar and silica and usually light colored (granite, rhyolite). **Mafic** rocks are rich in magnesium and iron and usually dark (gabbro, basalt). Intermediate rocks such as diorite and andesite are in between. The ingredients usually decide the color, and cooling speed decides the texture. Obsidian is an exception: it looks black even though its makeup is usually like granite's. Basalt is the most common volcanic rock on Earth and makes up most of the ocean floor."], bullets: [] },
              ],
              keyIdeas: ["Rocks are mixtures of minerals, grouped by how they form: igneous, sedimentary and metamorphic.", "Slow cooling underground makes large crystals (intrusive); fast cooling at the surface makes small crystals or glass (extrusive)."],
            },
            worksheet: {
              title: "Worksheet 2: Igneous Rock ID",
              instructions: "Use the reading to classify each rock. Word bank: granite, basalt, obsidian, pumice, gabbro, rhyolite.",
              parts: [
                { heading: "Part A: Classify the rocks", instructions: "For each, give the texture, intrusive or extrusive, light or dark, and the rock name.", items: ["1. Light pink and white with large, easy-to-see crystals of quartz and feldspar", "2. Dark gray to black; crystals too small to see; forms the ocean floor", "3. Shiny black, smooth and glassy; breaks with sharp, curved edges", "4. Pale gray, full of tiny holes, floats on water", "5. Dark green-black with large, visible crystals", "6. Light pink-gray; crystals too small to see without a microscope"] },
                { heading: "Part B: Evidence and reasoning", instructions: "", items: ["7. Two samples have the same minerals. Sample X has crystals about 5 mm across; sample Y's crystals are visible only under a microscope. Which cooled deep underground? Explain.", "8. Pumice is full of holes. Explain how those holes formed.", "9. Claim, evidence, reasoning: a rock has large crystals scattered in a fine-grained background. How did it cool?"] },
              ],
            },
            answerKey: {
              worksheet: ["Part A. 1. Coarse, intrusive, light, granite. 2. Fine, extrusive, dark, basalt. 3. Glassy, extrusive, dark in appearance, obsidian. 4. Bubbly (vesicular), extrusive, light, pumice. 5. Coarse, intrusive, dark, gabbro. 6. Fine, extrusive, light, rhyolite.", "Part B. 7. Sample X: large crystals need time to grow, and magma cools slowly underground because the surrounding rock insulates it. 8. The lava held dissolved gases; as it erupted, pressure dropped and the gas formed bubbles, which were frozen in place as the lava hardened quickly. 9. Claim: it cooled in two stages. Evidence: large crystals in a fine-grained background. Reasoning: large crystals grew while the magma cooled slowly underground; it then erupted or rose near the surface, where the rest cooled quickly into tiny crystals (porphyritic texture)."],
              exitTicket: "They cooled at different speeds. Granite cooled slowly underground, so large crystals grew; obsidian cooled so quickly at the surface that no crystals formed, making glass.",
            },
          },
          {
            n: 3, dayLabel: "Wed, Oct 28",
            title: "Sedimentary Rocks: Layers of Time",
            summary: "Juniper follows sediment from mountain to sea floor and learns to read the story told by rock layers.",
            bigQuestion: "How do loose bits of rock become solid rock, and what can layers tell us?",
            objectives: ["Sequence the five processes that turn rock into sedimentary rock.", "Classify sedimentary rocks as clastic, chemical or organic.", "Use the law of superposition to order rock layers from oldest to youngest."],
            vocabulary: ["sediment", "weathering", "erosion", "deposition", "compaction", "cementation", "clastic", "law of superposition", "fossil"],
            materials: "Lesson 3 reading; Worksheet 3; exit ticket. Optional demo: a clear jar with lid, a cup of mixed gravel, sand and garden soil, water.",
            reference: CK12 + ", Lesson 4.3, with Lesson 11.2",
            segments: [
              { time: "0:00 to 0:04", name: "Warm-up and demo setup", activity: "\"After a big storm, rivers turn brown. Where does all that mud go?\" While Juniper answers, fill the jar with the gravel mix and water, shake it hard and set it down." },
              { time: "0:04 to 0:14", name: "Reading and discussion", activity: "Read \"Sedimentary Rocks: Layers of Time.\" Act out compaction (press down on a stack of paper) and cementation (glue)." },
              { time: "0:14 to 0:26", name: "Worksheet 3: Reading the Layers", activity: "Sequence the processes, sort rocks, and interpret a rock column like a detective. At about 0:20, check the jar: the largest grains settled first, at the bottom." },
              { time: "0:26 to 0:30", name: "Exit ticket", activity: "Juniper answers the exit ticket." },
            ],
            exitTicket: "You find a rock made of rounded pebbles cemented together. Name the rock, and describe one thing it tells you about where the pebbles came from.",
            differentiation: { support: "Put the five process words on cards to physically order before writing.", challenge: "Describe how an older layer could end up on top of a younger one. (Folding or overturning during mountain building.)" },
            adaptations: ["ADHD: the jar demo gives a reason to get up and check at 0:20.", "Interests: the rock column is presented as a case file, with each layer as a clue."],
            reading: {
              title: "Sedimentary Rocks: Layers of Time",
              sections: [
                { heading: "", paragraphs: ["Every grain of sand on a beach was once part of a larger rock. **Sedimentary rocks** form from these pieces, called **sediment**, and from minerals that come out of water. They cover most of Earth's land surface as a thin skin over igneous and metamorphic rock."], bullets: [] },
                { heading: "From mountain to rock in five steps", paragraphs: [], bullets: ["**Weathering**: rain, ice, wind, temperature changes and living things break rock into sediment or dissolve some of its minerals.", "**Erosion**: water, wind, glaciers and gravity carry sediment away, wearing off sharp corners.", "**Deposition**: when water or wind slows down, it drops its load in flat layers.", "**Compaction**: the weight of more layers squeezes the lower ones, pressing grains together and squeezing out water.", "**Cementation**: minerals dissolved in groundwater (calcite, quartz, iron oxides) crystallize between grains and glue them into solid rock."] },
                { heading: "Three kinds of sedimentary rock", paragraphs: ["**Clastic** rocks are made of broken pieces, named by grain size: conglomerate (rounded gravel, tumbled a long way by water), breccia (angular gravel that did not travel far), sandstone (sand), siltstone (silt) and shale (clay, from mud in quiet water).", "**Chemical** rocks form when minerals crystallize out of water, such as rock salt and rock gypsum left behind when a shallow sea evaporates. **Organic** rocks form from the remains of living things: coal from buried swamp plants, and much limestone from shells and skeletons of sea creatures, which is why limestone often contains fossils."], bullets: [] },
                { heading: "Reading the layers", paragraphs: ["In a stack of undisturbed layers, the oldest is at the bottom and the youngest at the top. This is the **law of superposition**. Geologists use it, with fossils, to put events in Earth's history in order. Fossils are found almost entirely in sedimentary rock, because gentle burial can preserve shells, bones and footprints, while the heat of igneous and metamorphic processes usually destroys them."], bullets: [] },
              ],
              keyIdeas: ["Weathering, erosion, deposition, compaction and cementation turn rock fragments into sedimentary rock.", "Sedimentary rocks can be clastic, chemical or organic. In undisturbed layers, the oldest is on the bottom."],
            },
            worksheet: {
              title: "Worksheet 3: Reading the Layers",
              instructions: "Use the reading. The canyon layers below have not been folded or overturned.",
              parts: [
                { heading: "Part A: Put the processes in order", instructions: "Number them 1 to 5.", items: ["Cementation", "Weathering", "Deposition", "Erosion", "Compaction"] },
                { heading: "Part B: Sort the rocks", instructions: "Write clastic, chemical or organic.", items: ["Sandstone", "Rock salt", "Coal", "Conglomerate", "Fossil-rich limestone", "Shale", "Rock gypsum", "Breccia"] },
                { heading: "Part C: The case of the canyon wall", instructions: "Layers from top to bottom: E sandstone with ripple marks like modern dunes; D shale with fossil fish and leaves; C limestone with fossil clams and corals; B conglomerate with rounded pebbles of granite; A granite with large crystals and no fossils.", items: ["1. Which layer is oldest? Which is youngest? What rule did you use?", "2. Layer C formed in what kind of environment? Give your evidence.", "3. Where did Layer B's granite pebbles most likely come from, and how did they get rounded?", "4. Describe how the environment changed from Layer C to Layer E."] },
              ],
            },
            answerKey: {
              worksheet: ["Part A. Weathering 1, Erosion 2, Deposition 3, Compaction 4, Cementation 5.", "Part B. Clastic: sandstone, conglomerate, shale, breccia. Chemical: rock salt, rock gypsum. Organic: coal, fossil-rich limestone.", "Part C. 1. Oldest: A (granite); youngest: E. Superposition orders the sedimentary layers B to E. Granite is igneous and was not deposited as a layer; the evidence that it is older is that Layer B contains pebbles eroded from granite. 2. A shallow sea: the clams and corals lived in seawater. 3. From weathered granite like Layer A; water tumbled them along a river or beach. 4. Sea (C) to a lake, river or coast with fish and plants (D) to a dry, sandy desert with dunes (E): the water became shallower and then disappeared."],
              exitTicket: "Conglomerate. The rounded shapes show the pebbles were carried a long way by water (a river or beach) before being deposited.",
            },
          },
          {
            n: 4, dayLabel: "Thu, Oct 29",
            title: "Metamorphic Rocks and the Rock Cycle",
            summary: "Juniper learns how heat and pressure transform rock, then connects all three rock families in one model.",
            bigQuestion: "How can a rock change without melting, and how are all rocks connected?",
            objectives: ["Explain how heat, pressure and hot fluids change rock without melting it.", "Distinguish foliated from nonfoliated metamorphic rocks and match them with their parent rocks.", "Use a rock cycle model to show how rocks change type and which energy source drives each change."],
            vocabulary: ["metamorphic", "parent rock", "foliated", "nonfoliated", "contact metamorphism", "regional metamorphism", "rock cycle"],
            materials: "Lesson 4 reading with the rock cycle diagram; Worksheet 4; exit ticket. Optional: a ball of mixed-color clay, samples of shale, slate, sandstone, quartzite, limestone and marble.",
            reference: CK12 + ", Lessons 4.4 and 4.1",
            segments: [
              { time: "0:00 to 0:04", name: "Warm-up", activity: "\"What happens to bread in a panini press? Is it still bread?\" Heat and pressure change its texture without turning it into a liquid. Metamorphic rock is like that." },
              { time: "0:04 to 0:16", name: "Reading and discussion", activity: "Read \"Metamorphic Rocks and the Rock Cycle.\" Squeeze a flecked clay ball between two books to show minerals lining up (foliation). Walk the rock cycle arrow by arrow: \"What energy powers this arrow?\"" },
              { time: "0:16 to 0:26", name: "Worksheet 4: Changed Rocks", activity: "Match parent rocks, sort foliated and nonfoliated rocks, and trace one path through the rock cycle." },
              { time: "0:26 to 0:30", name: "Exit ticket", activity: "Juniper answers the exit ticket." },
            ],
            exitTicket: "A sandstone is buried deep beneath a growing mountain range. Name the rock it could become, and the process that changes it.",
            differentiation: { support: "Give a parent-rock family tree: shale to slate to phyllite to schist to gneiss; limestone to marble; sandstone to quartzite.", challenge: "Explain why metamorphic rocks are common in the cores of old mountain ranges." },
            adaptations: ["ADHD: the clay squeeze is a hands-on break in the middle of the reading.", "Interests: Juniper sketches her own rock cycle diagram instead of copying one."],
            reading: {
              title: "Metamorphic Rocks and the Rock Cycle",
              sections: [
                { heading: "", paragraphs: ["**Metamorphic** means \"changed form.\" A metamorphic rock starts as a **parent rock** (igneous, sedimentary or metamorphic). Under high heat, high pressure or hot mineral-rich fluids, its minerals change while the rock stays solid. If it melted completely, it would become magma, and the result would be igneous rock."], bullets: [] },
                { heading: "What causes metamorphism?", paragraphs: [], bullets: ["Heat from nearby magma or from deep burial, where temperature rises with depth.", "Pressure from the weight of rock above and from plates colliding and building mountains.", "Hot fluids that add some elements and carry others away."] },
                { heading: "Two kinds of metamorphism", paragraphs: ["**Contact metamorphism** happens where magma bakes the rock around it; the effect fades with distance. **Regional metamorphism** affects huge areas, often hundreds of kilometers across, when rocks are buried and squeezed during mountain building. Most metamorphic rock forms this way."], bullets: [] },
                { heading: "Foliated and nonfoliated rocks", paragraphs: ["When pressure squeezes harder from one direction, flat or long minerals like mica line up in layers or bands. This is **foliation**: slate (from shale), phyllite, schist and gneiss are foliated. Rocks made mostly of one mineral usually are not: marble (from limestone), quartzite (from sandstone), and hornfels, which is dark, dense and fine-grained. From shale to slate to phyllite to schist to gneiss, each step forms at higher temperature and pressure."], bullets: [] },
                { heading: "The rock cycle", paragraphs: ["Over thousands to millions of years, any rock can become any other kind. The **rock cycle** models these changes. It has no single starting point and no required order: a rock can skip steps or even become a new rock of the same type."], bullets: ["Earth's internal heat, left from the planet's formation and produced by radioactive decay, melts rock, drives metamorphism and moves plates, which lift buried rock to the surface.", "Energy from the Sun drives the water cycle and wind, which weather and erode rock.", "Gravity pulls sediment downhill and compacts buried layers."] },
              ],
              keyIdeas: ["Metamorphic rocks form when heat, pressure and fluids change a parent rock without melting it.", "The rock cycle shows how any rock can change into any other type, powered by Earth's internal heat, the Sun's energy and gravity."],
            },
            worksheet: {
              title: "Worksheet 4: Changed Rocks",
              instructions: "Use today's reading and your rock cycle sketch.",
              parts: [
                { heading: "Part A: Match each metamorphic rock with its parent", instructions: "Parent rocks: A. Sandstone, B. Shale, C. Limestone, D. Granite. A letter may be used more than once.", items: ["1. Marble", "2. Quartzite", "3. Slate", "4. Hornfels", "5. Gneiss (name one possible parent)"] },
                { heading: "Part B: Foliated or nonfoliated?", instructions: "Write F or N.", items: ["Slate", "Marble", "Gneiss", "Quartzite", "Schist", "6. What causes foliation?"] },
                { heading: "Part C: Trace a path", instructions: "", items: ["Describe the steps a granite mountain could take to become quartzite. Name each rock or material and each process.", "7. Name one rock cycle process powered mainly by the Sun's energy and one powered mainly by Earth's internal heat."] },
              ],
            },
            answerKey: {
              worksheet: ["Part A. 1. C. 2. A. 3. B. 4. B. 5. D (granite) or B (shale).", "Part B. Slate F, Marble N, Gneiss F, Quartzite N, Schist F. 6. Pressure that squeezes harder from one direction makes flat or long minerals line up in parallel layers or bands.", "Part C. Granite mountain → weathering and erosion break it into sand → deposition, compaction and cementation make sandstone → heat and pressure turn it into quartzite. 7. Sun: weathering and erosion. Internal heat: melting or metamorphism."],
              exitTicket: "Quartzite, through metamorphism by heat and pressure (regional metamorphism) as it is buried.",
            },
          },
          {
            n: 5, dayLabel: "Fri, Oct 30",
            title: "Review and Unit Quiz",
            summary: "Juniper reviews with a rock cycle model, then shows what she knows on the unit quiz.",
            bigQuestion: "Can I trace a rock's journey through the rock cycle?",
            objectives: ["Label a rock cycle model and trace one rock's journey through it.", "Demonstrate understanding of minerals, rock types and the rock cycle on the unit quiz."],
            vocabulary: [],
            materials: "Worksheet 5; Unit Quiz; Lesson 4 rock cycle diagram (put away during the quiz).",
            reference: CK12 + ", Chapters 3 and 4",
            segments: [
              { time: "0:00 to 0:09", name: "Review: A Rock's Journey", activity: "Juniper completes Worksheet 5, then you go over the answers aloud." },
              { time: "0:09 to 0:10", name: "Transition", activity: "Put away the worksheets and readings. Hand out the quiz." },
              { time: "0:10 to 0:30", name: "Unit Quiz", activity: "Juniper completes the 25-point quiz on her own." },
            ],
            exitTicket: "The unit quiz replaces today's exit ticket.",
            differentiation: { support: "Allow the word bank during Worksheet 5.", challenge: "Trace a second path through the rock cycle that skips sedimentary rock entirely." },
            adaptations: ["ADHD: a two-minute movement break before the quiz; the quiz timer can pause without losing points."],
            reading: null,
            worksheet: {
              title: "Worksheet 5: A Rock's Journey",
              instructions: "Word bank: melting; cooling and crystallizing; weathering and erosion; deposition, compaction and cementation; heat and pressure.",
              parts: [{ heading: "Trace the journey", instructions: "", items: ["1. A grain of quartz starts in a granite mountain. List, in order, the rocks and processes it could pass through to end up in a metamorphic rock.", "2. Which processes are powered mainly by Earth's internal heat?"] }],
            },
            answerKey: {
              worksheet: ["1. Granite → weathering and erosion → sand → deposition, compaction, cementation → sandstone → heat and pressure → quartzite. Also valid: granite → heat and pressure → gneiss.", "2. Melting, heat and pressure (metamorphism), and cooling and crystallizing of magma (accept it either way, since the heat came from Earth's interior)."],
              exitTicket: "",
            },
          },
        ],
        quiz: {
          title: "Rocks and Minerals Quiz",
          instructions: "25 points. Work on your own. Read every answer choice before you choose.",
          points: 25,
          sections: [
            { heading: "Part A: Multiple choice (1 point each)", instructions: "", definitions: [], items: [
              { n: 1, prompt: "Which of these is not a mineral?", choices: ["a) Quartz", "b) Ice in a glacier", "c) Obsidian", "d) Halite"] },
              { n: 2, prompt: "Which property is the most reliable for identifying a mineral?", choices: ["a) Color", "b) Streak", "c) Size of the sample", "d) Where it was found"] },
              { n: 3, prompt: "A mineral scratches calcite (hardness 3) but is scratched by fluorite (hardness 4). Its hardness is about", choices: ["a) 2", "b) 3.5", "c) 5", "d) 7"] },
              { n: 4, prompt: "A mineral that splits along smooth, flat surfaces has", choices: ["a) cleavage", "b) fracture", "c) luster", "d) streak"] },
              { n: 5, prompt: "An igneous rock with large, easy-to-see crystals most likely", choices: ["a) cooled quickly on Earth's surface", "b) cooled slowly deep underground", "c) formed from layers of sand", "d) was squeezed by pressure"] },
              { n: 6, prompt: "Pumice can float on water because it", choices: ["a) contains many holes left by gas bubbles in the lava", "b) is made of the lightest mineral, talc", "c) formed slowly underground", "d) is a sedimentary rock made of shells"] },
              { n: 7, prompt: "Which list shows the correct order of steps for forming sandstone?", choices: ["a) Deposition, weathering, cementation, erosion, compaction", "b) Weathering, erosion, deposition, compaction, cementation", "c) Erosion, weathering, compaction, deposition, cementation", "d) Cementation, compaction, deposition, erosion, weathering"] },
              { n: 8, prompt: "A rock made of rounded pebbles cemented together is", choices: ["a) breccia", "b) shale", "c) conglomerate", "d) slate"] },
              { n: 9, prompt: "In a stack of undisturbed sedimentary layers, the oldest layer is", choices: ["a) at the top", "b) in the middle", "c) at the bottom", "d) impossible to determine"] },
              { n: 10, prompt: "Marble is a metamorphic rock that forms from", choices: ["a) granite", "b) limestone", "c) sandstone", "d) basalt"] },
              { n: 11, prompt: "Foliation in a metamorphic rock forms when", choices: ["a) the rock melts and cools quickly", "b) minerals line up because pressure squeezes harder from one direction", "c) water deposits layers of sediment", "d) gas bubbles escape from lava"] },
              { n: 12, prompt: "The energy that powers weathering and erosion comes mainly from", choices: ["a) Earth's internal heat", "b) the Sun", "c) the Moon", "d) Earth's magnetic field"] },
            ] },
            { heading: "Part B: Matching (1 point each)", instructions: "Write the letter of the best definition. Two definitions will not be used.", definitions: ["A. Melted rock that has reached Earth's surface", "B. Melted rock below Earth's surface", "C. Loose pieces of rock, mineral or shell", "D. Igneous rock that cooled slowly underground", "E. The color of a mineral's powder", "F. Rock changed by heat and pressure"], items: [
              { n: 13, prompt: "Magma", choices: [] }, { n: 14, prompt: "Lava", choices: [] }, { n: 15, prompt: "Sediment", choices: [] }, { n: 16, prompt: "Intrusive rock", choices: [] },
            ] },
            { heading: "Part C: Short answer (3 points each)", instructions: "", definitions: [], items: [
              { n: 17, prompt: "Granite and rhyolite are made of nearly the same minerals. Explain why granite has large crystals and rhyolite has tiny ones.", choices: [] },
              { n: 18, prompt: "A geologist finds a layer of limestone full of fossil clams high on a hillside, far from any ocean. What type of rock is limestone, and what does the fossil evidence tell you about this place's past?", choices: [] },
              { n: 19, prompt: "Describe one path by which a sedimentary rock could become an igneous rock. Name each process and the energy source that drives it.", choices: [] },
            ] },
          ],
          answers: [
            { n: 1, answer: "c" }, { n: 2, answer: "b" }, { n: 3, answer: "b" }, { n: 4, answer: "a" }, { n: 5, answer: "b" }, { n: 6, answer: "a" },
            { n: 7, answer: "b" }, { n: 8, answer: "c" }, { n: 9, answer: "c" }, { n: 10, answer: "b" }, { n: 11, answer: "b" }, { n: 12, answer: "b" },
            { n: 13, answer: "B" }, { n: 14, answer: "A" }, { n: 15, answer: "C" }, { n: 16, answer: "D" },
          ],
          rubric: ["3: Correct, complete explanation using accurate vocabulary and the key cause-and-effect link.", "2: Mostly correct, but missing one part (for example, names the process but not the reason or the energy source).", "1: Partial understanding; includes an error or only restates the question.", "0: No answer, or incorrect."],
          shortAnswerExamples: [
            { n: 17, answer: "Granite is intrusive: it cooled slowly underground, so crystals had time to grow large. Rhyolite is extrusive: it cooled quickly at or near the surface, so crystals stayed tiny. Same ingredients, different cooling rate." },
            { n: 18, answer: "Limestone is a sedimentary rock (organic or biochemical). The fossil clams show the area was once covered by a sea. Later the land was lifted up by plate movement, or sea level fell, leaving the rock high and dry." },
            { n: 19, answer: "The sedimentary rock is buried deep in the crust, perhaps where plates collide (driven by Earth's internal heat), becomes hot enough to melt into magma, and the magma cools and crystallizes into igneous rock. Full credit names melting and cooling/crystallizing and identifies Earth's internal heat." },
          ],
        },
        review: {
          rounds: 2,
          status: "ready",
          summary: "Passed fact-check and safety screening. Ready to assign.",
          fixes: [
            { round: 1, where: "Lesson 1 reading", problem: "The reference text (2011) says more than 4,000 minerals are known; the International Mineralogical Association's list now includes more than 6,000.", fix: "Scientists have named more than 6,000 minerals", source: "International Mineralogical Association list of minerals", severity: "error" },
            { round: 1, where: "Lesson 4 reading", problem: "The reference text describes hornfels as having alternating light and dark bands. Standard references describe hornfels as fine-grained and nonfoliated; banding is characteristic of gneiss.", fix: "hornfels, which is dark, dense, and fine-grained", source: "Standard petrology references", severity: "error" },
            { round: 1, where: "Lesson 2 reading", problem: "The reference text states that the entire mantle is igneous rock; mantle rock is not usually classified that way, and the claim is not needed for the learning goals.", fix: "Claim removed", source: "Standard geology references", severity: "error" },
            { round: 2, where: "Lesson 1 reading", problem: "Copper coin hardness varies with the metal; giving a range avoids a wrong boundary.", fix: "a copper coin about 3 to 3.5", source: "Mohs scale references", severity: "precision" },
          ],
          flags: [],
          safety: [{ path: "", concern: "Dilute acid test included only as an optional, parent-handled demo with goggles; safety note added.", severity: "note" }],
        },
        sources: [
          { citation: CK12 + ". Used under CC BY-NC-SA 3.0.", note: "Lessons 3.1 to 3.4, 4.1 to 4.4 and 11.2. Lesson numbers follow the 2011 edition." },
          { citation: "NGSS Lead States, Next Generation Science Standards (2013), adopted in New Jersey as NJSLS-S", note: "MS-ESS2-1, MS-ESS3-1, MS-ESS1-4" },
        ],
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SAMPLE_UNIT;
  } else {
    root.J4M = root.J4M || {};
    root.J4M.SAMPLE_UNIT = SAMPLE_UNIT;
  }
})(typeof window !== "undefined" ? window : globalThis);
