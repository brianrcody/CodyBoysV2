# iCloud Photo Download & Conversion Workflow

Covers downloading photos from an iCloud shared album, converting HEIC to JPEG, and reorganizing
into the `"Nate and Finn, Month YYYY"` directory structure used by the website.

---

## Scripts

All four scripts live in `~/bin/` (symlinked or copied from `localScripts/`):

| Script | What it does |
|---|---|
| `download-icloud-album.sh` | Downloads a named iCloud album into the current directory via `icloudpd` |
| `convert-heic.sh` | Converts all `.HEIC` files under the current directory to `.jpg` |
| `convert_heic.py` | Python worker called by `convert-heic.sh`; not invoked directly |
| `reorganize-icloud-photos.sh` | Flattens `YYYY/MM/DD/file` tree into `"Nate and Finn, Month YYYY"` directories |

---

## System Requirements

### Operating System
Ubuntu 22.04+ (or any Debian-based distro). The workflow uses a Python virtualenv, so the
distro matters mainly for the native `libheif` dependency.

### System packages (apt)
`pillow-heif` requires the native HEIF codec library:

```bash
sudo apt install libheif1 libheif-dev
```

Versions confirmed working: `libheif1 1.17.6-1ubuntu4.2`.

### Python virtualenv
The entire Python stack (icloudpd, Pillow, pillow-heif) lives in a single venv at
`~/.venv/icloudpd/`. Confirmed versions:

| Package | Version |
|---|---|
| Python | 3.12.3 |
| icloudpd | 1.32.2 |
| Pillow | 12.1.1 |
| pillow-heif | 1.3.0 |

---

## Fresh Machine Setup

### 1. Install system dependencies

```bash
sudo apt install python3.12 python3.12-venv libheif1 libheif-dev
```

### 2. Create the virtualenv and install packages

```bash
python3.12 -m venv ~/.venv/icloudpd
~/.venv/icloudpd/bin/pip install icloudpd pillow pillow-heif
```

### 3. Place scripts in ~/bin

```bash
cp localScripts/{download-icloud-album.sh,convert-heic.sh,convert_heic.py,reorganize-icloud-photos.sh} ~/bin/
chmod +x ~/bin/download-icloud-album.sh ~/bin/convert-heic.sh ~/bin/reorganize-icloud-photos.sh
```

`convert_heic.py` is a Python script — it does not need to be executable, just readable.

### 4. Verify the venv paths in the shell scripts

`download-icloud-album.sh` and `convert-heic.sh` both hardcode paths into the venv:

```bash
~/.venv/icloudpd/bin/icloudpd ...
~/.venv/icloudpd/bin/python ~/bin/convert_heic.py ...
```

If you install the venv elsewhere, update those two lines accordingly.

### 5. Authenticate icloudpd (first run only)

```bash
cd /tmp && ~/bin/download-icloud-album.sh "any album name"
```

`icloudpd` will prompt for your Apple ID password and a 2FA code on first run. It caches the
session cookie in `~/.local/share/icloudpd/` (or similar); subsequent runs are non-interactive
as long as the session stays valid. Apple sessions typically expire after a few weeks.

---

## Usage

### Full workflow

Run all three steps in a scratch directory. The scripts operate on the current working directory.

```bash
mkdir ~/Downloads/icloud-import && cd ~/Downloads/icloud-import

# 1. Download
download-icloud-album.sh "Nate and Finn 2025"

# 2. Convert HEIC → JPEG
convert-heic.sh

# 3. Reorganize into "Nate and Finn, Month YYYY" directories
reorganize-icloud-photos.sh
```

After step 3 you will have flat directories like:

```
Nate and Finn, January 2025/
Nate and Finn, February 2025/
...
```

Move or copy these into `photos/albums/` on the server, then run `processPhotos.php` to generate
`display/` and `thumb/` subdirectories.

### Notes on each step

**Step 1 — download**

`icloudpd` writes photos into a `YYYY/MM/DD/` tree. It skips files already present, so re-running
is safe. HEIC, MOV, and JPEG files are all downloaded as-is.

**Step 2 — HEIC conversion**

`convert-heic.sh` recurses through the full tree and converts every `.HEIC` file in place,
writing a `.jpg` sibling. The original `.HEIC` files are left untouched — delete them manually
once you confirm the JPEGs look correct:

```bash
find . -name "*.HEIC" -delete
```

MOV files (videos) are ignored by the converter and will survive into the reorganized directories;
remove them manually if unwanted.

**Step 3 — reorganize**

`reorganize-icloud-photos.sh` moves files (not copies) out of the `YYYY/MM/DD/` tree into the
flat `"Nate and Finn, Month YYYY"` directories. Filename collisions are resolved by appending the
day number and an incrementing counter: `IMG_001_15.jpg`, `IMG_001_15_2.jpg`, etc. After all
files are moved, the now-empty date directories are deleted automatically.

---

## Troubleshooting

**`icloudpd` authentication fails after working previously**
Apple sessions expire. Re-authenticate by running a download interactively — it will prompt for
2FA again.

**`ModuleNotFoundError: No module named 'pillow_heif'`**
The wrong Python is being used. `convert-heic.sh` explicitly calls
`~/.venv/icloudpd/bin/python`, so this should not happen unless the venv path changed.

**`libheif` not found / `pillow-heif` import error**
The native library is missing. Run `sudo apt install libheif1` and reinstall `pillow-heif`
in the venv (`pip install --force-reinstall pillow-heif`).

**HEIC files still present after conversion**
`convert_heic.py` leaves originals intact by design. Delete them with `find . -name "*.HEIC" -delete`.

**Filename collisions produce unexpected names**
The collision suffix is `_DD` (day of month), not `_N`. This can look odd (`IMG_001_5.jpg` for
the 5th) but is deterministic and avoids clobbering.
