# Whack-a-Dog 🐶

A playful whack-a-mole style game where the "moles" are two very good dogs.
Tap or click the pups as they pop out of their holes before they duck back down!

## How to play

1. Pick a difficulty: **Easy**, **Normal**, or **Hard**.
2. Press **Start Game**.
3. Whack (tap / click) every dog that pops up before the 30-second timer runs out.
4. Each whack scores points. Beat your best score!

### Features

- **Combo multiplier** — chain whacks without a mistake to build a streak.
  Every 3 hits bumps your multiplier (up to **x5**), so each dog is worth more.
- **Sleeping dogs 😴 (penalty)** — some dogs pop up snoozing with a red tint.
  Whack one and you *lose points* and reset your combo. Let sleeping dogs lie!
- **Sound effects** — punchy whack blips, rising combo chimes, and a buzzer for
  penalties (Web Audio — no files needed). Toggle with the 🔊 button.
- **Best score** saved locally in your browser.

Difficulty changes how fast the dogs pop up, how long they stay, how many can be
up at once, and how often sleeping dogs appear.

## Running it

It's a static site — no build step. Just open `index.html` in a browser, or
serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project layout

```
index.html    – markup & HUD
style.css     – grassy board, holes, animations
script.js     – game loop, scoring, difficulty
assets/       – the two dog "moles"
```

Works on desktop and touch devices. High score is saved locally in your browser.
