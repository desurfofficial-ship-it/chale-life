# PlayGTA5 Investigation & Accra Life Environment Plan

*Prepared by Hark · 8 October 2026*

## Bottom line

**The playgta5 repository is useless to Accra Life and should not be copied from.** It's the website code, plus scraping and launcher scripts, of a taken-down site that ran a pirated GTA V engine in the browser. It contains **no game, no engine binary and no 3D assets**. The 19.7 GB of game data it needs is Rockstar's copyrighted content, which the repo tells you to "find yourself". The repo has **no licence**, and its core runtime code exists to drive an engine built from Rockstar source code. Nothing in it is legally reusable.

**Your current project is already the right foundation.** Accra Life (`chale-life`) is a React Three Fiber / three.js browser game. It runs on your iPhone from a link, has 145 automated tests and a robot playtest in CI, and uses about 25 of its 150 draw-call budget. Switching to Godot, Unity or Unreal would throw that away for no gain at this stage.

**The environment gap is assets, not technology.** No free, licence-verified 3D asset is truly Ghanaian. The way forward is free CC0 low-poly kits (Kenney, KayKit, Quaternius) for shapes, CC0 surface textures (red laterite, corrugated sheet, painted plaster, shutters) for the Accra feel, and a small set of custom Ghana props: kiosk, umbrella stall, compound wall, electricity poles, signs and tro-tro livery.

Verified facts are marked **[V]**. Inferences are marked **[I]**.

---

## A. Repository Investigation Report

### What it is

| Item | Finding |
| --- | --- |
| Owner / age | `shadany7824`, all commits on 7 Oct 2026 **[V]** |
| Stated purpose | README: "This code is grabbed from playgta5.com before it got took down" **[V]** |
| Licence | **No LICENSE file [V]**, so by default all rights are reserved, and no reuse right is granted to anyone |
| Size | 58 MB, almost all of it a bundled Windows Python runtime **[V]** |
| Playable as-is? | **No.** It needs a missing `mirror/` folder (19.7 GB of GTA V data plus `game.wasm`), which the author refuses to host because it is Rockstar content **[V]** |

### Important files and what they do

| File / folder | Purpose (verified by reading the source) |
| --- | --- |
| `homepage.html` (44 KB) | Scraped landing page of playgta5.com **[V]** |
| `loader.js` (9 KB) | Starts the engine's main worker, then spins up a GPU worker and an I/O worker. Its comments describe it as the "Emscripten module" host for `game.js` **[V]** |
| `game.js` (124 KB, minified) | Emscripten "glue" for a C++ program compiled to WebAssembly (pthreads, shared memory). Only the glue is here; the actual `game.wasm` (63 MB) is **not** in the repo **[V]** |
| `wgpu_worker.js` (191 KB) | Translates the engine's DirectX 11 graphics commands into WebGPU in a separate worker **[V]** |
| `io_worker.js` (40 KB) | Streams game files over HTTP byte ranges into a persistent browser cache (OPFS, the browser's private file store) in 256 KB blocks, to avoid memory blow-ups **[V]** |
| `serve_local.py`, `Launch-Local.cmd`, `Start-Local.ps1` | Local web server that adds the cross-origin isolation headers (COOP/COEP) and byte-range support the engine needs **[V]** |
| `mirror_site.py`, `public_discovery.py`, `bundle_runtime.py`, `build_portable_zip.py` | Scripts that scraped and downloaded the site's files, and packaged a portable ZIP **[V]** |
| `inspect_assets.py`, `engine_static_evidence.py`, `verify_snapshot.py`, `append_investigation.py` | Forensic scripts that read archive headers and WebAssembly symbols to work out what the engine is **[V]** |
| `INVESTIGATION.md`, `ENGINE_INVESTIGATION.md` | Their own findings: GTA V PC-format archives, plus a WebAssembly build with **41,244 `rage::` symbols and Rockstar development source paths** (`E:\P1\GTA5\SRC\DEV_NG\...`) **[V]** (their analysis, consistent with the files) |
| `data-manifest.json`, `shader-index.json`, `snapshot/*.json` | File lists and hashes of the 20.9 GB GTA V data set (1,528 RPF archives). Lists only, no content **[V]** |
| `runtime/` | Bundled CPython 3.12 for Windows (PSF licence). Generic and irrelevant **[V]** |

### Missing dependencies

- `mirror/playgta5.com/` with `game.wasm` and about 20.9 GB of GTA V data (RPF archives). This is copyrighted Rockstar material and must not be obtained **[V]**.
- A WebGPU-capable desktop browser and cross-origin isolation headers **[V]**.

### Limitations and legal concerns

1. **No licence**, so reuse is not permitted, even for the "original" glue scripts.
2. The JavaScript runtime exists to run an engine with Rockstar source lineage (the RAGE engine). Copying it ties your project to that.
3. Running a stranger's bundled `python.exe` and scripts is an unnecessary security risk.
4. The tech targets desktop GPUs and needs gigabytes of data. That is the opposite of a game that runs smoothly on an iPhone from a link.

---

## B. Accra Life Relevance Assessment

| Component / technique | Verdict | Why |
| --- | --- | --- |
| `game.js`, `wgpu_worker.js`, `loader.js`, `io_worker.js` code | **IGNORE (don't copy)** | No licence. Tied to a pirated engine. Built for a C++/DirectX engine, not three.js |
| GTA V data / mirror | **IGNORE** | Copyrighted. Do not recover it |
| Scraper / downloader / forensic scripts | **IGNORE** | Built for scraping one website; nothing for building a world |
| Bundled Python runtime | **IGNORE** | Irrelevant; Accra Life uses Node/Vite |
| Idea: heavy work in background workers | **STUDY ONLY** | A sound principle. three.js already decodes compressed models and textures (meshopt/Draco, KTX2) in workers, so you get this for free |
| Idea: stream the world in pieces, cache in the browser | **STUDY ONLY → our own simple version** | Their 256 KB-block OPFS cache is overkill. For us: one small GLB file per district, loaded when the player gets near, cached by the browser's normal HTTP cache |
| Idea: COOP/COEP isolation headers | **STUDY ONLY / not needed** | Only needed for multithreaded WebAssembly. Accra Life doesn't use it, and GitHub Pages can't set these headers anyway |
| Idea: local server with byte ranges | **IGNORE** | `vite preview` already covers local testing |
| WebGPU translation layer | **IGNORE** | Our three.js runs on WebGL2, which every iPhone supports. WebGPU can come later via three's own renderer if ever needed |

**Nothing is REUSE or ADAPT.** The only value is three architectural ideas, and Accra Life will implement them in simpler, original form.

- Rendering: WebGL2 with a stylised low-poly look. One sun plus ambient light, with baked or cheap shadows. Simple materials (Lambert/Toon) using diffuse-only 1K textures.
- Draw calls: budget 150. Repeated props (trees, poles, road tiles, crates) use instancing. Static buildings in a block are merged per material. Kits stay on 1–3 shared texture atlases.
- Asset pipeline: raw downloads go in `asset-sources/` (outside the build). An optimise script (`gltf-transform`: meshopt compression + KTX2 textures) writes to `public/models/<group>/*.glb`. Every shipped file gets a row in `docs/assets/LICENSES.csv` (asset, author, URL, licence, attribution text). CI fails if a model has no ledger row or exceeds its size budget.
- World organisation: keep the existing data-driven layout (`src/data/locations.ts`, `src/world/starter`). Add districts, each a self-contained module with its own layout data and one GLB bundle, loaded when the player approaches and unloaded when far away.
- Performance strategy: hard budgets checked in CI: draw calls ≤150, triangles ≤300k on screen, texture memory ≤128 MB, first load ≤5 MB. Also an iPhone frame-rate check per milestone. Distant buildings get simpler versions (LODs) or flat billboards (impostors).

---

## C. Free Environment Asset Manifest (summary)

Every licence below was checked on the asset's own page. The full 10-section manifest, with every URL, format, poly count and import note, is committed as `docs/specs/asset-manifest.md`. Asset abbreviations: PH = Poly Haven, aCG = ambientCG. Licence: CC-BY = credit required.

| # | Asset | Category | Licence | Format | Priority | Import / optimisation |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Kenney City Kit (Roads) v2.1 · kenney.nl/assets/city-kit-roads | Roads, signs, traffic lights | CC0 | OBJ/FBX/GLB | P1 | Instance each tile type: 1 draw call per type |
| 2 | KayKit City Builder Bits · kaylousberg.itch.io/city-builder-bits | Buildings, roads, cars | CC0 | GLTF/FBX/OBJ | P1 | Single tiny atlas, cheapest on draw calls |
| 3 | Kenney City Kit (Suburban) · kenney.nl/assets/city-kit-suburban | Low-rise houses | CC0 | OBJ/FBX/GLB | P1 | Re-skin as compound houses |
| 4 | PH Red Laterite Soil Stones · polyhaven.com/a/red_laterite_soil_stones | Ground | CC0 | JPG/PNG maps, glTF | P1 | 1K, KTX2. The most "Accra" texture available |
| 5 | PH Rusty Corrugated Iron + aCG Corrugated Steel 007A (blue) | Roofs, kiosks, fences | CC0 | Maps 1K–8K | P1 | 1K diffuse only on mobile |
| 6 | PH Painted Plaster Wall · polyhaven.com/a/painted_plaster_wall | Walls | CC0 | Maps | P1 | One texture, tinted per house |
| 7 | PH Rusty Metal Shutter · polyhaven.com/a/rusty_metal_shutter | Shopfronts | CC0 | Maps | P1 | Closed-shop state |
| 8 | Quaternius Palm Trees · poly.pizza/m/VYslw9DEi6 | Vegetation | CC0 | GLTF/FBX | P1 | Instanced |
| 9 | KayKit Forest Nature Pack (free) · kaylousberg.itch.io/kaykit-forest | Trees, bushes, grass | CC0 | GLTF/FBX/OBJ | P1 | Recolour atlas tropical |
| 10 | Kenney Car Kit v3.1 · kenney.nl/assets/car-kit | Cars → Accra taxi | CC0 | OBJ/FBX/GLB | P1 | Paint yellow corners |
| 11 | "Car Rapide" Senegal minibus (KidBi-Gaming, Sketchfab) | Tro-tro stand-in | **CC-BY 4.0** | Sketchfab glTF | P1 | 39k tris, so cut to about 6k; repaint as tro-tro; credit required |
| 12 | Cartoony Motorcycle (AliceCassie) · poly.pizza/m/j20srJUjpB | Okada | CC0 | GLTF/OBJ | P1 | Recolour |
| 13 | Quaternius Universal Base Characters + Animation Library | Player and NPCs | CC0 | glTF/GLB | P1 | About 13k tris, so player and key NPCs only; set skin colour in code |
| 14 | Quaternius Modular Women/Men, Background Posed Humans | Crowd | CC0 | FBX (convert) | P2 | Cheap crowds |
| 15 | "Taxi through Kaneshie Market, Accra" · freesound.org/s/868008 | Audio | CC0 | WAV | P1 | Real Accra; 30–60 s loops, AAC |
| 16 | "Traffic in West Africa" · freesound.org/s/823522 | Audio | CC0 | M4A | P1 | iPhone-ready |
| 17 | SFXAFRIK market hawker traffic · freesound.org/s/582962 | Audio | **CC-BY 4.0** | WAV | P1 | Tro-tro station bed; credit |
| 18 | Ghana bus-station megaphone, Ghana rural birds | Audio | CC-BY 3.0 | WAV | P2 | Credit |

**Excluded:** Ready Player Me (shut down 31 Jan 2026), CGTrader "Ghanaian Kiosk" (not a free licence), Sketchfab items without a visible CC licence, and Poly Haven electricity poles (200k triangles; licence fine but far too heavy).

**Build it ourselves (no free Ghana version exists):** container kiosk, wooden market table with umbrella, compound wall with metal gate, wooden electricity pole with sagging wires, billboard frame, hand-painted sign atlas, tro-tro and taxi liveries, and an open-drain gutter strip. Each is under 500 triangles on one shared texture.

---

## D. Technical Architecture Recommendation

### Recommendation: keep React Three Fiber / three.js in the browser

| Option | Cost | AI-agent friendliness | iPhone reach | Asset import | Open world | Migration cost |
| --- | --- | --- | --- | --- | --- | --- |
| **R3F / three.js (current)** | Free, free hosting | Best: everything is plain text code that agents read, test and review in PRs | Instant link, no install | GLB is the native format; most kits ship it | Fine for a neighbourhood growing to a district, with chunking and instancing | None |
| Godot 4 | Free | Good (text scenes), but agents can't easily see or test it | Web export is heavy (about 30–40 MB) and weaker on iOS; native app needs App Store | Excellent | Better for a huge map | Full rewrite of 145 tests + rules |
| Unity | Free tier, then fees | Weak: binary scenes, editor-driven | Web builds heavy on iPhone | Excellent | Good | Full rewrite + editor skills |
| Unreal | Free until revenue | Weakest for agents | No web export; overkill for phones | Excellent | Best | Full rewrite, desktop-class only |

**Why:** your game already works on your phone, CI catches regressions, and most recommended assets already ship as GLB (the rest convert in one step). An engine switch only pays off if you later go for a huge, high-fidelity map or a native app store release. Revisit then, not now.

### How the world should be built

- **Rendering:** WebGL2 with a stylised low-poly look. One sun plus ambient light, with baked or cheap shadows. Simple materials (Lambert/Toon) using diffuse-only 1K textures.
- **Draw calls:** budget 150. Repeated props (trees, poles, road tiles, crates) use instancing. Static buildings in a block are merged per material. Kits stay on 1–3 shared texture atlases.
- **Asset pipeline:** raw downloads go in `asset-sources/` (outside the build). An optimise script (`gltf-transform`: meshopt compression + KTX2 textures) writes to `public/models/<group>/*.glb`. Every shipped file gets a row in `docs/assets/LICENSES.csv` (asset, author, URL, licence, attribution text). CI fails if a model has no ledger row or exceeds its size budget.
- **World organisation:** keep the existing data-driven layout (`src/data/locations.ts`, `src/world/starter`). Add districts, each a self-contained module with its own layout data and one GLB bundle, loaded when the player approaches and unloaded when far away.
- **Performance strategy:** hard budgets checked in CI: draw calls ≤150, triangles ≤300k on screen, texture memory ≤128 MB, first load ≤5 MB. Also an iPhone frame-rate check per milestone. Distant buildings get simpler versions (LODs) or flat billboards (impostors).

---

## E. Step-by-Step Implementation Plan

Each step is one PR, owned per `OWNERSHIP.md`. Nothing starts until the previous step's CI is green.

| # | Task (owner) | Output | Depends on | Acceptance | Risk → mitigation |
| --- | --- | --- | --- | --- | --- |
| 0 | Keep everything that exists | Current rules, store, HUD, tests, e2e, procedural street | — | Nothing deleted | Rewrites creep in, so the tickets say "extend, don't replace" |
| 1 | **W-003** Asset pipeline + licence ledger (Agent 3 + Agent 2 for scripts/CI) | `asset-sources/` (gitignored), `scripts/optimize-assets`, `public/models/`, `docs/assets/LICENSES.csv`, CI ledger and budget check | G-006 merged | A sample Kenney GLB goes in → optimised GLB out; CI fails if the ledger row is missing | Unlicensed files sneak in, so CI blocks them |
| 2 | W-004 First kits (Agent 3) | Kenney Roads + KayKit City Bits + palms + KayKit trees, instanced, replacing the procedural boxes one block at a time | 1 | Draw calls ≤60; e2e loop still green; screenshots | Kenney scale mismatch: normalise scale in the optimise step |
| 3 | W-005 Accra surfaces (Agent 3) | Laterite, plaster (tinted), corrugated blue/rust, shutter, concrete, asphalt, all 1K KTX2 | 1 | Texture memory ≤64 MB; looks "Accra" in iPhone screenshots | Photoreal clashes with low-poly: diffuse only, colour-graded |
| 4 | W-006 Ghana props (Agent 3) | Container kiosk, umbrella stall, compound wall + gate, poles + wires, billboard, sign atlas, taxi/tro-tro liveries | 1 | Each under 500 tris, one atlas; Daavi's kiosk and Maame Effia use them | Hand-modelled art takes time: start with simple box shapes made in code, refine later |
| 5 | W-007 Chalé Street neighbourhood (Agent 3 + 4) | One polished ~120 × 120 m block: Daavi's, Maame Effia, chop bar, tro-tro stop, compound, parked taxi/tro-tro, 6–10 static NPCs, CC0 Accra ambience | 2–4 | Walk loop + work/eat/sleep all playable; 55+ fps on your iPhone | Scope creep: one block only |
| 6 | E-006 Performance harness (Agent 2) | CI reports draw calls, triangles and texture memory per screenshot and fails over budget; on-screen debug stats with `?stats=1` | 2 | Budgets enforced | Software WebGL in CI isn't an iPhone, so also do the manual phone check each milestone |
| 7 | Expansion | District #2 (e.g. market or lorry station) as its own chunk with distance loading; traffic on spline paths; LOD/impostors | 5, 6 | Two districts, no hitch crossing the border, memory stable | Memory growth: unload far districts; budgets per district |

---

## F. Immediate Next Actions (by impact ÷ effort)

1. Close tonight's security items: GitHub 2FA (deadline midnight) and delete the old Google API key. These protect everything else.
2. Merge G-006 (sleep), then send W-003. It's the asset pipeline and licence ledger, which every later asset depends on.
3. Have Agent 3 pull the P1 CC0 packs: Kenney Roads, KayKit City Bits, palms, KayKit Forest, about 30 MB of downloads, shipped far smaller after optimising.
4. W-005 Accra surface set: the cheapest big visual win. Six 1K CC0 textures make the boxes read as Accra.
5. W-006 custom kiosk, umbrella stall and electricity poles with wires: the three props that say "Ghana" instantly.

**Not done, by design:** nothing was copied from the playgta5 repo, no assets were downloaded, and no game code was changed. The only repository change is a docs-only PR adding this report and the asset manifest.
