# Finite Automata Simulator

An interactive web-based tool to design, visualize, and simulate **Deterministic Finite Automata (DFA)** and **Non-Deterministic Finite Automata (NFA)**.

Built as a Theory of Computation project.

---

## Features

- **Educational Landing Page** — Learn about automata theory, states, transitions, alphabets, and the formal 5-tuple definition before using the simulator
- **DFA & NFA Support** — Switch between deterministic and non-deterministic modes
- **Dynamic State Generation** — Configure any number of states and alphabet symbols
- **Transition Table** — Fill in transitions via an auto-generated table
- **Graph Visualization** — Interactive state diagram powered by [vis-network](https://visjs.github.io/vis-network/docs/network/)
- **Step-by-Step Simulation** — Run input strings and see each δ transition traced in real time
- **Accept/Reject Output** — Instant visual feedback on whether the input string is accepted or rejected
- **DFA Validation** — Enforces DFA rules (exactly one transition per symbol, no ε-transitions)

---

## Project Structure

```
automata-simulator/
├── index.html        # Landing page (entry point)
├── landing.css       # Landing page styles
├── simulator.html    # Simulator page
├── style.css         # Simulator styles
├── script.js         # Simulator logic
└── README.md
```

---

## How to Run

1. Clone or download this repository
2. Open `index.html` in any modern web browser
3. Read through the concepts, then click **"Run the Simulator"**
4. Or open `simulator.html` directly to jump straight into the simulator

> No server, no build step, no dependencies to install — just open and use.

---

## How to Use the Simulator

1. **Select Automata Type** — DFA or NFA
2. **Set Number of States** — e.g. `3` creates states q0, q1, q2
3. **Define Alphabet** — comma-separated, e.g. `a,b`
4. **Set Accept States** — e.g. `q2` or `q1,q2`
5. **Click "Generate Automaton"** — creates the transition table
6. **Fill in Transitions** — enter target states (e.g. `q1`) in each cell
7. **Click "Draw Transitions"** — renders the state diagram
8. **Enter Input String** — e.g. `aabb`
9. **Click "Run Simulation"** — watch the step-by-step trace and result

---

## Technologies Used

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure & semantics |
| CSS3 | Styling, animations, responsive layout |
| JavaScript | Simulator logic & interactivity |
| [vis-network](https://visjs.github.io/vis-network/docs/network/) | Graph visualization (CDN) |
| [Google Fonts](https://fonts.google.com/) | Inter & JetBrains Mono typography |

---

## Topics Covered (Landing Page)

- What is Automata Theory
- Finite Automaton definition
- States & Transitions
- Alphabet & Input Strings
- Start State & Accept State
- Transition Function (δ)
- DFA rules & restrictions
- NFA characteristics
- DFA vs NFA comparison

---

## License

This project is open source and available for educational use.
