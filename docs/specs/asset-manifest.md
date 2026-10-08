# Accra Life: Verified Free Asset Manifest (Environment)

**Target:** React Three Fiber / three.js, GLB/glTF, iPhone Safari, low-poly stylised look, about 150 draw calls. **Compiled:** 8 Oct 2026. I opened every asset page listed under a category table (web_fetch, or the Poly Haven public API for formats and poly counts) and checked its licence there. Nothing was downloaded. **Licence key:** CC0 = public domain, commercial use OK, no attribution. CC-BY = commercial use OK, credit required. Pixabay = Pixabay Content Licence (free, no attribution, no standalone resale). Mixamo = Adobe royalty-free terms (not Creative Commons).

**The honest picture:** I found **no free, licence-verified 3D asset that is actually Ghanaian**: no compound house, tro-tro, Accra kiosk, chop bar, or Ghanaian signage. The closest verified items are two West African vehicles from Senegal on Sketchfab (CC-BY). The workable plan is to use **generic CC0 low-poly kits** (Kenney / KayKit / Quaternius) for geometry, then supply the Ghanaian feel yourself: **CC0 PBR textures** (laterite, painted plaster, blue rusty corrugated sheet, roller shutters), **custom signage/billboard decals** (hand-painted shop names, church/phone-network ads, "God is King"-style tro-tro slogans), recoloured vehicles in Accra taxi colours (yellow corners), and **real Accra field recordings**, which do exist free.

---

## 0. Pipeline notes (apply to everything)

- **Kenney packs:** the pack pages give licence and file count only, not formats. Kenney's own import guide says glTF ships as GLB in Kenney packs and that FBX and GLB are equal in features (https://kenney.nl/knowledge-base/game-assets-3d/importing-3d-models-into-game-engines). Expect OBJ/FBX/GLB, but **confirm the GLB folder after unzipping**. Each pack uses one shared colormap texture, so merge or instance by material.
- **FBX/OBJ-only packs** (older Quaternius): convert with Blender (File > Import FBX > Export glTF 2.0 `.glb`). Then run `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2` (or draco). Dedupe materials and join meshes per prop before export.
- **Draw calls (~150):** a city block can blow this budget quickly. Use InstancedMesh (drei `<Instances>`/`<Merged>`) for repeated props, trees and road tiles. Merge static building chunks per material with `BufferGeometryUtils.mergeGeometries`. Keep the whole kit on 1 to 3 atlases. KayKit and Kenney are ideal here because each pack uses a single atlas texture.
- **Textures on iPhone:** use 1K (at most 2K) from Poly Haven / ambientCG. Convert to **KTX2/Basis** to save GPU memory. Drop displacement maps, and keep diffuse + normal + ARM (Poly Haven's AO/Rough/Metal packed map) at most.
- **Audio on iPhone Safari:** convert to **AAC (.m4a)** with an MP3 fallback. Keep 30 to 60 s seamless loops, mono, 96 to 128 kbps. Freesound downloads need a free account.
- **Sketchfab:** downloads need a login. Sketchfab usually offers an auto-converted glTF/GLB alongside the original; confirm at download. **Reject any model whose licence reads "Standard" or "Editorial"** (store/editorial licences, not CC). Every Sketchfab item below was CC-BY 4.0 on its page.

---

## 1. Buildings (low-rise residential, compound houses, shops, kiosks, stalls, city kits)

| Asset | Source URL | Licence | Commercial | Attribution | Formats | Priority | Import/optimisation notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kenney City Kit (Suburban) v2.0 | https://kenney.nl/assets/city-kit-suburban | CC0 | Yes | No | Not on page; Kenney KB: OBJ/FBX/GLB | **P1** | 40 files of low-rise houses with colour variations. Best base for **compound-house walls + single-storey homes**. Re-skin with plaster/corrugated textures or vertex colours. Shared colormap, so merge per block. |
| KayKit City Builder Bits (Kay Lousberg) | https://kaylousberg.itch.io/city-builder-bits | CC0 (itch licence field + page text) | Yes | No | OBJ, FBX, **GLTF** | P1 | 32+ low-poly models (buildings, roads, cars, street bits). One 1024² gradient atlas that "can be downsampled to 128×128", which makes it the best draw-call profile of anything here. Free tier is 4.6 MB. Paid "Extra" ($3.95) adds park pieces; optional. Page says "please don't resell unmodified copies". |
| Kenney City Kit (Commercial) v2.1 | https://kenney.nl/assets/city-kit-commercial | CC0 | Yes | No | Not on page; Kenney KB: OBJ/FBX/GLB | P2 | 50 files, mainly skyscrapers. Use only the **low shopfront/ground-floor pieces** (think Osu/Oxford St, Makola edges). Skip towers for a neighbourhood map. |
| Kenney City Kit (Industrial) v2.0 | https://kenney.nl/assets/city-kit-industrial | CC0 | Yes | No | Not on page; Kenney KB: OBJ/FBX/GLB | P2 | 40 files: warehouses/factories (v2.0 adds solar/wind). Good for **fitting shops, sheds, container-style workshops** with corrugated textures. |
| Kenney Mini Market | https://kenney.nl/assets/mini-market | CC0 | Yes | No | Not on page; Kenney KB: OBJ/FBX/GLB | P2 | 20 files (shop/market/store tags, has animation + variations). Shelving/stall/shop props for **kiosk interiors and provision stores**. Exact contents not listed on page. |
| Quaternius Downtown City MegaKit (May 2026) | https://quaternius.com/packs/downtowncitymegakit.html | CC0 | Yes | No | FBX, Blend, glTF (Blend = paid Source tier) | P2 | 315 modular pieces with shared optimised texture sets, but it is a Boston/NYC style, so too dense and too Western. Cherry-pick **street-level shopfront, awning and sidewalk pieces**. The free "Standard" tier is about 60 to 70% of the pack. |
| Kenney Fantasy Town Kit v2.0 | https://kenney.nl/assets/fantasy-town-kit | CC0 | Yes | No | Not on page; Kenney KB: OBJ/FBX/GLB | P3 | 160 files, medieval. **Uncertain fit.** Only worth it if it contains usable wooden stall/awning pieces for a **market**. Check after unzip. |

**Ghana gap:** no free compound house, kiosk (container/wooden "table-top" kiosk), or chop-bar model was verified. I recommend modelling a **container kiosk + wooden market stall + compound wall with gate** in Blender (each under 500 tris, sharing one atlas) using Kenney/KayKit pieces as a style guide. A CGTrader "African Ghanaian Kiosk" exists but is under CGTrader's Royalty Free licence, not CC, so I excluded it (see UNVERIFIED).

---

## 2. Roads, sidewalks, markings, intersections

| Asset | Source URL | Licence | Commercial | Attribution | Formats | Priority | Import/optimisation notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kenney City Kit (Roads) v2.1 | https://kenney.nl/assets/city-kit-roads | CC0 | Yes | No | Not on page; Kenney KB: OBJ/FBX/GLB | **P1** | 90 files. v2.1 added **road signs and traffic lights**. Tile-based straights, corners and intersections. Instance tiles by type so each type costs 1 draw call. Swap the asphalt colour to dusty grey and add laterite shoulders. |
| KayKit City Builder Bits (roads subset) | https://kaylousberg.itch.io/city-builder-bits | CC0 | Yes | No | OBJ, FBX, GLTF | P1 (same pack as §1) | Includes road and sidewalk tiles on the same atlas as its buildings and cars, so a consistent style and very cheap. |
| Quaternius Modular Streets Pack (2018) | https://quaternius.com/packs/modularstreets.html | CC0 | Yes | No | FBX, OBJ, Blend (no glTF) | P3 | 25 untextured modular road pieces. **Needs FBX→GLB conversion.** Backup if Kenney's tile scale doesn't fit. |
| ambientCG Road 007 (texture) | https://ambientcg.com/a/Road007 | CC0 (https://docs.ambientcg.com/license/) | Yes | No | PBR JPG/PNG maps, 1K–8K (1K-JPG zip ≈ 6 MB) | P2 | Asphalt with dashed centre-line markings and patches, ~7.5 m × 7.5 m. Use on a long road plane instead of many tiles to save draw calls. 1K + KTX2. |

---

## 3. Terrain and surface textures (dirt, laterite, concrete, asphalt, corrugated metal, painted plaster)

All Poly Haven items: CC0 per https://polyhaven.com/license. Formats confirmed via api.polyhaven.com/files/`<id>`: JPG/PNG/EXR maps + **glTF** + Blend + MaterialX, with **nor_gl** (the OpenGL normal three.js needs) and a packed **ARM** map.

| Asset | Source URL | Licence | Commercial | Attribution | Formats | Priority | Import/optimisation notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Poly Haven: Red Laterite Soil Stones | https://polyhaven.com/a/red_laterite_soil_stones | CC0 | Yes | No | Maps 1K–8K, glTF, Blend, MTLX | P1 | **The single most "Accra" texture available:** red laterite with gravel. 2 m real-world width. Use 1K diffuse + nor_gl + ARM for roadsides, compounds and unpaved lanes. |
| Poly Haven: Red Dirt Mud 01 | https://polyhaven.com/a/red_dirt_mud_01 | CC0 | Yes | No | Maps, glTF, Blend, MTLX | P2 | Wet red earth for rainy-season puddles and gutters. 1.5 m width. |
| Poly Haven: Rusty Corrugated Iron | https://polyhaven.com/a/rusty_corrugated_iron | CC0 | Yes | No | Maps, glTF, Blend, MTLX | P1 | Roofing sheets for compound houses, kiosks and fences. Tile on roof planes. |
| ambientCG Corrugated Steel 007 A | https://ambientcg.com/a/CorrugatedSteel007A | CC0 | Yes | No | PBR JPG/PNG 1K–8K (1K-JPG ≈ 5 MB) | P1 | **Blue painted, rusting corrugated sheet** (tags: blue, paint, rust). Matches Accra fences/kiosks. Variants 007B/007C on the same page. |
| Poly Haven: Corrugated Iron 02 | https://polyhaven.com/a/corrugated_iron_02 | CC0 | Yes | No | Maps (incl. Metal), glTF, Blend, MTLX | P3 | Cleaner galvanised alternative. |
| Poly Haven: Painted Plaster Wall | https://polyhaven.com/a/painted_plaster_wall | CC0 | Yes | No | Maps, glTF, Blend, MTLX | P1 | Base wall material. Tint per building in shader (cream, pastel green, ochre, sky blue) so many colours share one texture. |
| Poly Haven: Yellow Plaster | https://polyhaven.com/a/yellow_plaster | CC0 | Yes | No | Maps, glTF, Blend, MTLX | P2 | Weathered warm plaster for older compound walls. |
| ambientCG Painted Plaster 017 | https://ambientcg.com/a/PaintedPlaster017 | CC0 | Yes | No | PBR JPG/PNG 1K–16K (1K-JPG ≈ 5 MB) | P3 | White painted plaster (photogrammetry). Tintable alternative. |
| Poly Haven: Rusty Metal Shutter | https://polyhaven.com/a/rusty_metal_shutter | CC0 | Yes | No | Maps, glTF, Blend, MTLX | P1 | **Roller shutters** for shop and kiosk fronts (closed-shop state at night). |
| Poly Haven: Painted Metal Shutter | https://polyhaven.com/a/painted_metal_shutter | CC0 | Yes | No | Maps, glTF, Blend, MTLX | P2 | Painted variant; add a decal shop name on top. |
| Poly Haven: Asphalt 02 | https://polyhaven.com/a/asphalt_02 | CC0 | Yes | No | Maps, glTF, Blend, MTLX | P2 | Worn asphalt for main roads. 3 m width. |
| Poly Haven: Concrete Pavement | https://polyhaven.com/a/concrete_pavement | CC0 | Yes | No | Maps, glTF, Blend, MTLX | P2 | Sidewalks, gutters (open drains), compound floors. |

**Stylised-look note:** these are photoreal PBR scans. For a low-poly look, use only the **diffuse map**, posterised or blurred and colour-graded, on MeshLambertMaterial/MeshToonMaterial, or bake them into a small atlas. Skip normal/ARM maps on mobile.

---

## 4. Vegetation (palms, tropical trees, grass, bushes)

| Asset | Source URL | Licence | Commercial | Attribution | Formats | Priority | Import/optimisation notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Quaternius "Palm Trees" (via Poly Pizza) | https://poly.pizza/m/VYslw9DEi6 | CC0 | Yes | No | FBX, **GLTF** | P1 | Low-poly palms, GLB-ready. Instance them (1 draw call per palm type). |
| KayKit Forest Nature Pack (free tier) | https://kaylousberg.itch.io/kaykit-forest | CC0 | Yes | No | FBX, GLTF, OBJ | P1 | 100+ free trees, bushes, grass and rocks on one 1024² gradient atlas (downsamples to 128²). Free zip is 6.1 MB. Shifts to tropical by recolouring the atlas. Paid Extra ($9.99) adds terrain and recolours; optional. |
| Quaternius Ultimate Nature Pack (2019) | https://quaternius.com/packs/ultimatenature.html | CC0 | Yes | No | FBX, OBJ, Blend (no glTF) | P2 | 150 untextured models (itch listing tags include palm and cactus). **Needs FBX→GLB conversion.** |
| Quaternius Stylized Nature MegaKit | https://quaternius.com/packs/stylizednaturemegakit.html | CC0 | Yes | No | FBX, OBJ, glTF (Blend = paid Source) | P2 | 116 textured models (40 trees, 35 plants, 27 rocks, grass, bushes). Ghibli/temperate look: use bushes and grass clumps, not the pines. Leaf textures cost extra draw calls versus atlas packs. |
| Kenney Nature Kit | https://kenney.nl/assets/nature-kit | CC0 | Yes | No | Not on page; Kenney KB: OBJ/FBX/GLB | P3 | 330 files. Mostly temperate; useful for rocks, small plants and ground clutter in the Kenney style. |

**Gap:** no free, licence-verified **neem, mango, plantain/banana or bougainvillea** model. Quaternius palms are the closest match. A mango/neem tree is easy to fake by recolouring a KayKit round tree. Avoid Poly Haven grass/tree scans (1 to 17 million polys).

---

## 5. Street props (lights, electricity poles, billboards, benches, barrels, signs, canopies/umbrellas)

| Asset | Source URL | Licence | Commercial | Attribution | Formats | Priority | Import/optimisation notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kenney City Kit (Roads) v2.1 (signs, traffic lights) | https://kenney.nl/assets/city-kit-roads | CC0 | Yes | No | Kenney KB: OBJ/FBX/GLB | P1 | Same pack as §2. Road signs and traffic lights added in v2.1. Street-lamp inclusion is not stated on the page. |
| Poly Haven: Barrel 03 | https://polyhaven.com/a/barrel_03 | CC0 | Yes | No | glTF, FBX, Blend, USD + maps | P1 | **1,473 tris (API).** Metal drum for water storage, roadside fires, kiosk clutter. Use 1K maps or bake to a flat colour. |
| Poly Haven: Plastic Crate 02 | https://polyhaven.com/a/plastic_crate_02 | CC0 | Yes | No | glTF, FBX, Blend, USD + maps (has alpha) | P2 | 5,840 tris; decimate to under 500. Drink crates stacked at provision stores. Its alpha (perforated) material is costly on mobile, so swap it for a solid texture. |
| Poly Haven: Painted Wooden Bench | https://polyhaven.com/a/painted_wooden_bench | CC0 | Yes | No | glTF, FBX, Blend, USD + maps | P2 | **630 tris.** Roadside benches outside shops and chop bars. |
| Poly Haven: Street Lamp 02 | https://polyhaven.com/a/street_lamp_02 | CC0 | Yes | No | glTF, FBX, Blend, USD + maps | P2 | 20,338 tris, too heavy; decimate to about 300 or use as a modelling reference. Instance them. |
| Poly Haven: Modular Electricity Poles | https://polyhaven.com/a/modular_electricity_poles | CC0 | Yes | No | glTF, FBX, Blend, USD + maps | P3 (heavy) | **200,610 tris.** The licence is fine but it is not mobile-ready. Overhead wires and wooden poles are iconic in Accra, so build a 50-tri pole + Line/tube wires yourself, or heavily decimate this one. |
| Kenney Mini Market (props) | https://kenney.nl/assets/mini-market | CC0 | Yes | No | Kenney KB: OBJ/FBX/GLB | P2 | Shop shelves and goods for kiosk and stall dressing. |
| Sketchfab "Gbus Bus Stop" (sheba1998) | https://sketchfab.com/3d-models/gbus-bus-stop-ba4808305d8544eca08c0dcffda79ef4 | CC-BY 4.0 | Yes | Yes: credit "sheba1998" + link | Sketchfab download (glTF/GLB typically offered; confirm) | P3 | 3.8k tris, modern bus shelter (not Ghana-specific). Optional for a Kwame Nkrumah Circle-style stop. |

**Gaps, needing custom work:** billboards (a quad + post with your own ad textures), market umbrellas/canopies (an 8-sided cone, about 20 tris, in classic striped or faded colours), and hand-painted shop signs (decal planes, all text on one atlas). I verified no free asset for these, and they are what will make the scene read as Ghana.

---

## 6. Vehicles (cars, taxi, minibus/tro-tro stand-in, bus, motorbike)

| Asset | Source URL | Licence | Commercial | Attribution | Formats | Priority | Import/optimisation notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kenney Car Kit v3.1 | https://kenney.nl/assets/car-kit | CC0 | Yes | No | Not on page; Kenney KB: OBJ/FBX/GLB | P1 | 45 files (v3 added kart racers; v2 added debris). The page doesn't list the models; check the zip for taxi/van/truck bodies. Recolour a sedan **yellow corner panels** for an Accra taxi. Shared colormap. |
| Sketchfab "Car Rapide – Iconic Senegal Public Transport" (KidBi-Gaming) | https://sketchfab.com/3d-models/car-rapide-iconic-senegal-public-transport-d543f055db75441cb7cb797abcc6b58b | CC-BY 4.0 | Yes | Yes: credit "KidBi-Gaming" + link | Sketchfab download (glTF/GLB typically offered; confirm) | P1 (tro-tro stand-in) | The **only verified free West African minibus**. 39.4k tris, separate body/wheels/roof-rack meshes, hand-painted decals. Decimate to ~5–8k, repaint in tro-tro livery (white/blue Sprinter-style, slogan on rear). Senegalese, not Ghanaian; the shape is older and boxier. |
| Sketchfab "Bus_ Tata" (gamehubgamehubsenegal) | https://sketchfab.com/3d-models/bus--tata-89ad68e33d884b4bbefec619eae3fb70 | CC-BY 4.0 | Yes | Yes: credit "gamehubgamehubsenegal" + link | Sketchfab download (confirm) | P2 | 11.7k tris. Senegalese Tata city bus; repaint as a Metro Mass / intercity bus. |
| Quaternius Public Transport Pack (2017) | https://quaternius.com/packs/publictransport.html | CC0 | Yes | No | FBX, OBJ, Blend (no glTF) | P2 | 12 untextured vehicles (ambulance, school bus, train, more). Needs FBX→GLB. The school bus repainted works as a CC0 fallback for bus or tro-tro. |
| Quaternius Cars Pack (2018) | https://quaternius.com/packs/cars.html | CC0 | Yes | No | FBX, OBJ, Blend (no glTF) | P3 | 8 untextured cars. Needs FBX→GLB. Extra traffic variety. |
| "Cartoony Purple Motorcycle" (AliceCassie, Poly Pizza) | https://poly.pizza/m/j20srJUjpB | CC0 | Yes | No | OBJ, GLTF | P1 (okada) | CC0 low-poly motorbike, GLB-ready. Recolour red or black for an okada. |
| Low Poly Vespa (Poki3D, itch.io) | https://poki3d.itch.io/low-poly-vespa | CC0 (stated in description) | Yes | No | blend, fbx, glb, obj, stl | P2 | Scooter whose front wheel turns with the steering column. 4.1 MB zip. Note the licence is stated in the description text, not the itch licence field. |
| "Motorcycle" (Poly by Google, Poly Pizza) | https://poly.pizza/m/dse64pqMKAR | CC-BY 3.0 | Yes | Yes: "Poly by Google" + link | OBJ, GLTF | P3 | Alternative motorbike. A third-party mirror claims ~6.4k tris (not verified on Poly Pizza). |

---

## 7. Characters (rigged low-poly humans, animations, diverse skin tones)

| Asset | Source URL | Licence | Commercial | Attribution | Formats | Priority | Import/optimisation notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Quaternius Universal Base Characters (Aug 2025) | https://quaternius.com/packs/universalbasecharacters.html | CC0 | Yes | No | FBX, OBJ, glTF (Blend = paid Source) | P1 (player/hero NPCs) | 6 base bodies (regular/teen/superhero, M/F) + 20 hairstyles, humanoid rig. Average ~13k tris, too heavy for crowds; use for player and key NPCs only. Skin/eye colour customisation shaders come only in the paid Source tier, so for dark skin tones set the skin material colour in three.js yourself (that the free files have a separate skin material is my assumption, not checked). |
| Quaternius Universal Animation Library (Mar 2025) | https://quaternius.com/packs/universalanimationlibrary.html | CC0 | Yes | No | FBX, GLB, Blend | P1 | 120+ animations (8-direction locomotion, sit, push, emotes) on a universal humanoid rig compatible with the Base Characters above. Retarget in Blender, or share the skeleton and load clips via AnimationMixer. Strip unused clips to cut GLB size. |
| Quaternius Ultimate Modular Women Pack (2022) | https://quaternius.com/packs/ultimatemodularwomen.html | CC0 | Yes | No | Header: FBX, OBJ, Blend. Description: also glTF | P2 | 10 characters, 24 animations, swappable head/torso/legs/feet, humanoid-rig version included. Lighter, so good for crowd NPCs; recolour skin and clothing (kente/ankara-style textures). Format discrepancy on the page: check for glTF. There is a matching Ultimate Modular Men Pack at https://quaternius.com/packs/ultimatemodularcharacters.html (not opened, so unverified). |
| Quaternius Ultimate Animated Character Pack (2019) | https://quaternius.com/packs/ultimatedanimatedcharacter.html | CC0 | Yes | No | FBX, OBJ, Blend (no glTF) | P3 | 50+ animated characters. Needs FBX→GLB. Older style. |
| Quaternius Background Posed Humans Pack | https://quaternius.com/packs/backgroundposedhumans.html | CC0 | Yes | No | FBX, OBJ, Blend | P2 | 20 static posed humans, 8 hairstyles. Unrigged background crowd (market sellers, people waiting at a station); instance them very cheaply. Needs FBX→GLB. |
| Kenney Mini Characters | https://kenney.nl/assets/mini-characters | CC0 | Yes | No | Kenney KB: OBJ/FBX/GLB | P2 | 25 files, animated. Chibi proportions; tags include "disability". Very cheap. Fits only if the art direction goes chunky or toy-like. |
| Mixamo (Adobe) | https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html | Adobe royalty-free terms (not CC) | Yes ("personal, commercial, and non-profit projects including… video games") | No | FBX (download) | P2 | Free with an Adobe ID; auto-rigger + large animation library. FBX only, so convert to GLB. I did not verify the redistribution clauses in Adobe's full terms: ship animations only inside your game build, never as raw downloadable files. |

Ready Player Me is gone. Netflix bought it in Dec 2025 and the public avatar creator and APIs shut down on 31 Jan 2026 (https://techcrunch.com/2025/12/19/netflix-acquires-gaming-avatar-maker-ready-player-me/). Do not plan around it. Free alternatives are the Quaternius base characters + UAL above. Commercial selfie-to-avatar SDKs such as MetaPerson / Avatar SDK exist, but I did not verify their pricing or licence.

---

## 8. Environmental audio (city ambience, traffic, market crowd, birds; Accra/West Africa field recordings)

All Freesound pages show the licence badge next to the download button (opened and verified). Downloads need a free login.

| Asset | Source URL | Licence | Commercial | Attribution | Formats | Priority | Import/optimisation notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| "Taxi through Kaneshie Market, Accra (Ghana)" (edvard.rokkan, Aug 2026) | https://freesound.org/people/edvard.rokkan/sounds/868008/ | CC0 | Yes | No | WAV 48 kHz/16-bit stereo, 3:04, 33.8 MB | P1 | A real Accra market and traffic recording (Mantse Akramah St, recorded from a taxi with the windows open). Cut 30–60 s loops for the market district and in-vehicle ambience. Convert to AAC. |
| "Traffic in West Africa" (babybus) | https://freesound.org/people/babybus/sounds/823522/ | CC0 | Yes | No | M4A 44.1 kHz mono, 1:00, ~1 MB | P1 | Rush-hour traffic, traffic police and birds. City not named, so not confirmed Accra. Already AAC, so it is iPhone-ready. |
| "agbogbloshie.aif" (ikbenraar) | https://freesound.org/people/ikbenraar/sounds/457227/ | CC0 | Yes | No | AIFF 48 kHz/24-bit mono, 2:11, 18 MB | P2 | Walk through Agbogbloshie, Accra (industrial, construction). Workshop or scrapyard zone ambience. |
| "AMBTraf Ambience market hawker traffic near road" (SFXAFRIK) | https://freesound.org/people/SFXAFRIK/sounds/582962/ | CC-BY 4.0 | Yes | Yes: credit "SFXAFRIK" | WAV 96 kHz/24-bit stereo, 2:03, 68 MB | P1 | Market hawkers, car horns, motorcycles, bus conductors, tricycles: the tro-tro station sound. African; the country isn't stated. Downsample to 44.1 kHz. |
| "Ghana bus station megaphone" (jakubvalenta) | https://freesound.org/people/jakubvalenta/sounds/367174/ | CC-BY 3.0 | Yes | Yes: credit "jakubvalenta" | WAV 48 kHz stereo, 0:53, 9.8 MB | P2 | Kumasi station announcer calling "Accra, Tema". Great one-shot or loop at a lorry station. Phone recording, so lo-fi. |
| "AMB Ghana Rural, birds, bugs, distant vox" (daverose) | https://freesound.org/people/daverose/sounds/130754/ | CC-BY 3.0 | Yes | Yes: credit "daverose" | WAV 48 kHz/24-bit stereo, 3:31, 58 MB | P2 | Birds and insects in Biakpa, Ghana. Bed for quiet residential and compound areas and dawn. |
| "Ambiant African sounds of birds in the early morning" (bakiri) | https://freesound.org/people/bakiri/sounds/760805/ | CC-BY 4.0 | Yes | Yes: credit "bakiri" | WAV 96 kHz/24-bit mono, 8:06, 134 MB | P3 | Doves, birds, distant cars. Recorded in Johannesburg, so not West African; backup bird bed only. |
| Pixabay sound effects (platform) | https://pixabay.com/service/license-summary/ | Pixabay Content Licence | Yes | No (appreciated) | MP3 | P3 | Licence checked at platform level only: no standalone resale/redistribution, and nothing with recognisable trademarks used commercially. I verified no specific Ghana item there. Use for generic one-shots (horns, doors), and check each item's page. |

---

## 9. UNVERIFIED / EXCLUDED: do not use without checking

| Item | URL | Why excluded |
| --- | --- | --- |
| Sketchfab "Uploads_files_4067812_ Minibus" (tingting_er), Kenyan low-poly minibus | https://sketchfab.com/3d-models/uploads-files-4067812--minibus-b8bb7a4b814b4e8085bd938562f4a2fc | Licence not seen. Download goes via an external Google Drive link. The "uploads_files_" name suggests a re-upload from a marketplace, so provenance risk. |
| Sketchfab "Matatu V1" (cgkenya) | https://sketchfab.com/3d-models/matatu-v1-fe6eac58907f402785b769b197369b38 | No downloadable licence seen. 1.1M tris either way. |
| Sketchfab "Kumasi Ghana" (cnolet) | https://sketchfab.com/3d-models/kumasi-ghana-824f158f06ff4127aee83154e38a778b | Licence field blank in search excerpt; not opened. 11.2M-tri scan, unusable on mobile anyway. |
| Sketchfab "Ghana truck wooden model" (comapper) | https://sketchfab.com/3d-models/ghana-truck-wooden-model-160ed1f9f14a413291ad2b18508c6e4e | Licence not verified. 262.9k tris. |
| Sketchfab "Accra" (Block by Block, Minecraft map) | https://sketchfab.com/3d-models/accra-8c2711433cd84a518a604a7981947bee | Not shown as downloadable; licence not verified. |
| Sketchfab KidBi-Gaming "Senegalese informal urban taxi 'Clando'" and "mobile street coffee kiosk – Low Poly" | https://sketchfab.com/KidBi-Gaming | Seen in listings only; pages not opened. Worth checking next: same author as the CC-BY Car Rapide, and a kiosk would fill a gap. |
| CGTrader "African Ghanaian Kiosk" | https://www.cgtrader.com/3d-models/architectural/architectural-street/african-ghanaian-kiosk | CGTrader Royalty Free Licence (marketplace licence, possibly paid), not CC0/CC-BY. |
| Artlist "Soundscapes of Ghana – Busy Street in Accra City" | https://artlist.io/sfx/track/soundscapes-of-ghana---busy-street-in-accra-city/125006 | Paid subscription library, not free. |
| Freesound "African market atmos.wav" (mikewest, Zambia) | https://freesound.org/people/mikewest/sounds/407641/ | Search excerpt implied CC0, but I did not open the page. |
| Freesound "NKC morning" (babybus; Nouakchott, West Africa) | https://freesound.org/people/babybus/sounds/823519/ | Search excerpt implied CC0, but I did not open the page. |
| Quaternius Ultimate Modular Men Pack | https://quaternius.com/packs/ultimatemodularcharacters.html | Page not opened (the sister Women pack is verified CC0). |
| OpenGameArt (none selected) | — | Not searched in depth. Licences there vary per item (CC0 / CC-BY / CC-BY-SA / GPL); verify each one. |

Sketchfab's search API returned empty responses (bot protection), so Sketchfab coverage is limited to items found by web search. A manual Sketchfab search (filters: Downloadable + licence "CC0" / "CC Attribution") for tro tro, kiosk, Accra, Lagos, danfo, keke, okada may surface more.

---

## 10. Top 8 P1 assets to acquire first

1. **Kenney City Kit (Roads):** https://kenney.nl/assets/city-kit-roads (CC0). Road grid, intersections, signs and traffic lights.
2. **KayKit City Builder Bits:** https://kaylousberg.itch.io/city-builder-bits (CC0, GLTF, single atlas). Cheapest draw-call building, road and prop set.
3. **Kenney City Kit (Suburban):** https://kenney.nl/assets/city-kit-suburban (CC0). Low-rise homes to re-skin as compound houses.
4. **Poly Haven / ambientCG "Accra surface set" (all CC0):** Red Laterite Soil Stones https://polyhaven.com/a/red_laterite_soil_stones + Rusty Corrugated Iron https://polyhaven.com/a/rusty_corrugated_iron + ambientCG Corrugated Steel 007A https://ambientcg.com/a/CorrugatedSteel007A + Painted Plaster Wall https://polyhaven.com/a/painted_plaster_wall + Rusty Metal Shutter https://polyhaven.com/a/rusty_metal_shutter.
5. **Vegetation:** Quaternius Palm Trees https://poly.pizza/m/VYslw9DEi6 + KayKit Forest Nature Pack https://kaylousberg.itch.io/kaykit-forest (both CC0, glTF).
6. **Vehicles:** Kenney Car Kit https://kenney.nl/assets/car-kit (CC0, taxi recolour) + Car Rapide tro-tro stand-in https://sketchfab.com/3d-models/car-rapide-iconic-senegal-public-transport-d543f055db75441cb7cb797abcc6b58b (CC-BY 4.0, credit KidBi-Gaming) + CC0 motorbike https://poly.pizza/m/j20srJUjpB.
7. **Characters:** Quaternius Universal Base Characters https://quaternius.com/packs/universalbasecharacters.html + Universal Animation Library https://quaternius.com/packs/universalanimationlibrary.html (CC0, glTF/GLB, shared humanoid rig). Recolour for skin-tone diversity.
8. **Audio:** "Taxi through Kaneshie Market, Accra" https://freesound.org/people/edvard.rokkan/sounds/868008/ (CC0) + "Traffic in West Africa" https://freesound.org/people/babybus/sounds/823522/ (CC0) + SFXAFRIK market/hawker/traffic https://freesound.org/people/SFXAFRIK/sounds/582962/ (CC-BY 4.0).

### Attribution file (needed if you use the CC-BY items)

- "Car Rapide – Iconic Senegal Public Transport" by KidBi-Gaming, CC BY 4.0, sketchfab.com/3d-models/car-rapide-iconic-senegal-public-transport-d543f055db75441cb7cb797abcc6b58b
- "Bus_ Tata" by gamehubgamehubsenegal, CC BY 4.0, sketchfab.com/3d-models/bus--tata-89ad68e33d884b4bbefec619eae3fb70
- "Gbus Bus Stop" by sheba1998, CC BY 4.0, sketchfab.com/3d-models/gbus-bus-stop-ba4808305d8544eca08c0dcffda79ef4
- "Motorcycle" by Poly by Google, CC BY 3.0, poly.pizza/m/dse64pqMKAR
- "AMBTraf Ambience market hawker traffic near road" by SFXAFRIK, CC BY 4.0, freesound.org/s/582962/
- "Ghana bus station megaphone" by jakubvalenta, CC BY 3.0, freesound.org/s/367174/
- "AMB Ghana Rural, birds, bugs, distant vox" by daverose, CC BY 3.0, freesound.org/s/130754/
- "Ambiant African sounds of birds in the early morning" by bakiri, CC BY 4.0, freesound.org/s/760805/

CC0 creators to credit voluntarily: Kenney, Kay Lousberg, Quaternius, Poly Haven, ambientCG, Poki3D, AliceCassie, edvard.rokkan, babybus, ikbenraar.

### Custom-build shortlist (where nothing Ghana-specific exists free)

Container kiosk; wooden market table + umbrella; compound wall + metal gate; wooden electricity pole + sagging wires; billboard frame; tro-tro livery + rear slogan decals; Accra taxi livery (yellow corners); hand-painted shop/chop-bar sign atlas; gutter/open-drain strip. Each one is under 500 tris on one shared atlas, textured with the CC0 surfaces above.
