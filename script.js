/* ============================================
   Automata Simulator — Script (Monochrome)
   ============================================ */

var container = document.getElementById("diagram");
var nodes, edges, network;

/* === Playback & State Management === */
let simulationSteps = [];
let drawSteps = []; 
let currentStepIndex = 0;
let playbackMode = "drawing"; // "drawing" or "simulating"

function getSymbolColumns() {
  let alphabet = document.getElementById("alphabet").value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (document.getElementById("mode").value === "nfa") {
    if (!alphabet.includes("ε")) {
      return [...alphabet, "ε"];
    }
  }
  return alphabet;
}

function formatStateSet(states) {
  let sorted = Array.from(states).sort();
  return `{${sorted.join(", ")}}`;
}

function nfaEpsilonClosure(stateIds, transitions) {
  let closure = new Set(stateIds);
  let stack = [...stateIds];
  while (stack.length) {
    let state = stack.pop();
    let targets = transitions[state] && transitions[state]["ε"];
    if (!targets) continue;
    for (let next of targets) {
      if (!closure.has(next)) {
        closure.add(next);
        stack.push(next);
      }
    }
  }
  return closure;
}

/* === vis-network monochrome options === */
var options = {
  edges: {
    arrows: {
      to: { enabled: true, scaleFactor: 0.6 }
    },
    color: {
      color: "#888888",
      highlight: "#ffffff",
      hover: "#bbbbbb",
    },
    font: {
      color: "#e0e0e0",
      strokeWidth: 3,
      strokeColor: "#0a0a0a",
      size: 14,
      face: "JetBrains Mono, monospace",
      align: "middle",
      vadjust: -18
    },
    width: 2,
    hoverWidth: 3,
    smooth: {
      type: "curvedCW",
      roundness: 0.5,
    },
  },
  nodes: {
    shape: "circle",
    size: 50,
    font: {
      color: "#e0e0e0",
      size: 18,
      face: "Inter, sans-serif",
      bold: { color: "#ffffff" },
    },
    color: {
      background: "rgba(10, 10, 10, 1)",
      border: "#888888",
      highlight: {
        background: "rgba(30, 30, 30, 1)",
        border: "#ffffff",
      },
      hover: {
        background: "rgba(25, 25, 25, 1)",
        border: "#bbbbbb",
      },
    },
    borderWidth: 2,
    borderWidthSelected: 3,
    shadow: {
      enabled: true,
      color: "rgba(255, 255, 255, 0.06)",
      size: 12,
      x: 0,
      y: 4,
    },
  },
  physics: {
    stabilization: { iterations: 200 },
    barnesHut: {
      gravitationalConstant: -20000,
      springLength: 240,
      springConstant: 0.04,
      avoidOverlap: 1.0,
    },
  },
  interaction: {
    hover: true,
    tooltipDelay: 200,
    zoomView: true,
    dragView: true,
  },
};

/* === Initialize empty network === */
nodes = new vis.DataSet([]);
edges = new vis.DataSet([]);
network = new vis.Network(container, { nodes, edges }, options);

/* === Generate Automaton === */
function generateAutomaton() {
  let n = parseInt(document.getElementById("stateCount").value);
  let acceptInput = document.getElementById("acceptStates").value.trim();
  let acceptSet = new Set(
    acceptInput.split(",").map((s) => s.trim()).filter(Boolean)
  );

  // Arrange nodes in a circle — textbook style
  let radius = Math.max(120, n * 50);
  let centerX = 0, centerY = 0;

  let nodeList = [];
  for (let i = 0; i < n; i++) {
    let label = "q" + i;
    let isAccept = acceptSet.has(label);
    // Start from the top (-π/2) and go clockwise
    let angle = -Math.PI / 2 + (2 * Math.PI * i) / n;

    nodeList.push({
      id: i,
      label: label,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      fixed: false,
      borderWidth: isAccept ? 4 : 2,
      color: {
        background: isAccept
          ? "rgba(20, 20, 20, 1)"
          : "rgba(10, 10, 10, 1)",
        border: isAccept ? "#ffffff" : "#888888",
      },
    });
  }

  // Add phantom start node pointing to q0
  nodeList.push({
    id: "start",
    label: "start",
    shape: "text",
    font: { color: "#888888", size: 14, face: "Inter, sans-serif", bold: true },
    x: centerX + radius * Math.cos(-Math.PI / 2) - 35,
    y: centerY + radius * Math.sin(-Math.PI / 2),
    fixed: true
  });

  nodes = new vis.DataSet(nodeList);
  
  let initialEdges = [{
    id: "start-edge",
    from: "start",
    to: 0,
    arrows: "to",
    color: { color: "#888888", highlight: "#888888", hover: "#888888" },
    width: 2,
    smooth: false,
    physics: false
  }];

  network = new vis.Network(container, { nodes, edges: initialEdges }, options);

  let symbolColumns = getSymbolColumns();
  let alphabet = symbolColumns.filter((symbol) => symbol !== "ε");

  let table = "<div class='table-note'>Fill transitions using state names like q0 or q1. In NFA mode, the extra ε column supports epsilon transitions.</div><table><tr><th>State</th>";
  for (let symbol of symbolColumns) {
    table += "<th>" + symbol + "</th>";
  }
  table += "</tr>";

  for (let i = 0; i < n; i++) {
    table += "<tr><td>q" + i + "</td>";
    for (let symbol of symbolColumns) {
      table +=
        "<td><input type='text' id='t_" + i + "_" + symbol + "' placeholder='q?'></td>";
    }
    table += "</tr>";
  }
  table += "</table>";

  document.getElementById("transitionTable").innerHTML = table;

  document.getElementById("steps").innerText = "";
  let outputEl = document.getElementById("output");
  outputEl.innerText = "";
  outputEl.className = "result-badge";
}

/* === Draw Transitions === */
function drawTransitions() {
  let n = parseInt(document.getElementById("stateCount").value);
  let symbolColumns = getSymbolColumns();
  let alphabet = symbolColumns.filter((symbol) => symbol !== "ε");

  let edgeMap = {}; // Key: "from-to", Value: Array of symbols

  for (let i = 0; i < n; i++) {
    for (let symbol of symbolColumns) {
      let inputId = "t_" + i + "_" + symbol;
      let value = document.getElementById(inputId).value.trim();
      let mode = document.getElementById("mode").value;

      if (mode === "dfa" && symbol === "ε" && value !== "") {
        showAlert("DFA cannot contain ε transitions.");
        return;
      }

      if (mode === "dfa" && symbol !== "ε") {
        if (value === "") {
          showAlert("DFA requires every transition to be defined.");
          return;
        }
        if (value.includes(",")) {
          showAlert("DFA transitions must go to exactly one state.");
          return;
        }
      }

      if (value !== "") {
        let targets = value.split(",").map((s) => s.trim()).filter(Boolean);
        for (let t of targets) {
          if (!/^q\d+$/.test(t)) {
            showAlert(`Invalid state format: "${t}". Use "q0", "q1", etc.`);
            return;
          }

          let targetId = parseInt(t.replace("q", ""));
          if (targetId < 0 || targetId >= n) {
            showAlert(`State "q${targetId}" does not exist. Max state is "q${n - 1}".`);
            return;
          }

          let key = i + "-" + targetId;
          if (!edgeMap[key]) {
            edgeMap[key] = [];
          }
          edgeMap[key].push(symbol);
        }
      }
    }
  }

  // Get actual node positions from the network
  let positions = network.getPositions();
  // Calculate center of all nodes
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    if (positions[i]) { cx += positions[i].x; cy += positions[i].y; }
  }
  cx /= n; cy /= n;

  // Detect bidirectional pairs (A→B and B→A both exist)
  let pairSet = new Set();
  for (let key in edgeMap) {
    let [from, to] = key.split("-").map(Number);
    if (from !== to) {
      let reverseKey = to + "-" + from;
      if (edgeMap[reverseKey]) {
        pairSet.add(Math.min(from, to) + "-" + Math.max(from, to));
      }
    }
  }

  let edgeList = [];
  
  // Keep the start node edge to q0 indicated
  edgeList.push({
    id: "start-edge",
    from: "start",
    to: 0,
    arrows: "to",
    color: { color: "#888888", highlight: "#888888", hover: "#888888" },
    width: 2,
    smooth: false,
    physics: false
  });

  for (let key in edgeMap) {
    let [from, to] = key.split("-").map(Number);
    let edgeObj = {
      id: key,
      from: from,
      to: to,
      label: edgeMap[key].join(", "),
    };

    if (from === to) {
      // Self-loop: point outward from circle center
      let pos = positions[from];
      let outwardAngle = pos ? Math.atan2(pos.y - cy, pos.x - cx) : (-Math.PI / 4);
      edgeObj.smooth = false; // Disable smooth for self-loops to allow proper anchoring
      edgeObj.selfReference = {
        size: 20,
        angle: outwardAngle,
        renderBehindTheNode: false
      };
    } else {
      // Check if this is part of a bidirectional pair
      let pairKey = Math.min(from, to) + "-" + Math.max(from, to);
      if (pairSet.has(pairKey)) {
        // Use different curvatures for each direction
        let roundness = (from < to) ? 0.5 : -0.5;
        edgeObj.smooth = { type: "curvedCW", roundness: roundness };
      }
    }

    edgeList.push(edgeObj);
  }

  // Store the transitions for manual drawing animation
  // edgeList[0] is always start-edge (phantom node)
  drawSteps = edgeList;
  playbackMode = "drawing";
  currentStepIndex = 0;

  // Initialize with only states (no transitions initially, or just the start arrow)
  edges = new vis.DataSet([drawSteps[0]]); 
  network.setData({ nodes, edges });

  // Show playback controls
  let controls = document.getElementById("playback-controls");
  if (controls) {
    controls.style.display = "flex";
    document.getElementById("btn-prev").disabled = true;
    document.getElementById("btn-next").disabled = (drawSteps.length <= 1);
  }

  document.getElementById("steps").innerText = "Manual Drawing Mode: Use 'Forward' to draw transitions.";
  
  // Dynamically update self loops to always point outwards when physics move them
  network.on("stabilizationIterationsDone", updateSelfLoopAngles);
  network.on("stabilized", updateSelfLoopAngles);
  network.on("dragEnd", updateSelfLoopAngles);
  // Also call it once after a small delay to handle initial physics jiggle
  setTimeout(updateSelfLoopAngles, 500);
}

function loadPresetAutomaton() {
  let presetKey = document.getElementById("presetSelect").value;
  if (!presetKey) {
    showAlert("Choose a preset to load.");
    return;
  }

  let presets = {
    "dfa-ab-end": {
      mode: "dfa",
      states: 3,
      alphabet: "a,b",
      accept: "q2",
      transitions: {
        q0: { a: "q1", b: "q0" },
        q1: { a: "q1", b: "q2" },
        q2: { a: "q1", b: "q0" },
      },
    },
    "dfa-even-a": {
      mode: "dfa",
      states: 2,
      alphabet: "a,b",
      accept: "q0",
      transitions: {
        q0: { a: "q1", b: "q0" },
        q1: { a: "q0", b: "q1" },
      },
    },
    "nfa-substring-ab": {
      mode: "nfa",
      states: 3,
      alphabet: "a,b",
      accept: "q2",
      transitions: {
        q0: { a: "q0,q1", b: "q0" },
        q1: { a: "", b: "q2" },
        q2: { a: "q2", b: "q2" },
      },
    },
    "nfa-epsilon-demo": {
      mode: "nfa",
      states: 4,
      alphabet: "a,b",
      accept: "q3",
      transitions: {
        q0: { a: "q1", b: "q0" },
        q1: { "ε": "q2" },
        q2: { a: "q3" },
        q3: { a: "q3", b: "q3" },
      },
    },
  };

  let preset = presets[presetKey];
  if (!preset) return;

  document.getElementById("mode").value = preset.mode;
  document.getElementById("stateCount").value = preset.states;
  document.getElementById("alphabet").value = preset.alphabet;
  document.getElementById("acceptStates").value = preset.accept;
  generateAutomaton();

  let symbolColumns = getSymbolColumns();
  for (let i = 0; i < preset.states; i++) {
    let stateKey = "q" + i;
    let rowTransitions = preset.transitions[stateKey] || {};
    for (let symbol of symbolColumns) {
      let inputId = `t_${i}_${symbol}`;
      let cell = document.getElementById(inputId);
      if (!cell) continue;
      cell.value = rowTransitions[symbol] || "";
    }
  }

  drawTransitions();
}

function copyTransitionTable() {
  let table = document.getElementById("transitionTable");
  if (!table) return;

  let rows = Array.from(table.querySelectorAll("tr"));
  let text = rows
    .map((row) => {
      let cells = Array.from(row.querySelectorAll("th, td"));
      return cells
        .map((cell) => {
          let input = cell.querySelector("input");
          return input ? input.value.trim() || "-" : cell.textContent.trim();
        })
        .join("\t");
    })
    .join("\n");

  navigator.clipboard.writeText(text).then(() => {
    showAlert("Transition table copied to clipboard.");
  }).catch(() => {
    showAlert("Unable to copy table; please try again.");
  });
}

function resetAutomaton() {
  document.getElementById("transitionTable").innerHTML = "";
  document.getElementById("steps").innerText = "";
  document.getElementById("output").innerText = "";
  document.getElementById("output").className = "result-badge";
  drawSteps = [];
  simulationSteps = [];
  currentStepIndex = 0;
  playbackMode = "drawing";
  nodes = new vis.DataSet([]);
  edges = new vis.DataSet([]);
  network.setData({ nodes, edges });
}

/* === Update Self-Loop Angles to Point Outward === */
function updateSelfLoopAngles() {
  if (!network || !edges) return;
  let positions = network.getPositions();
  let nodeIds = Object.keys(positions);
  if (nodeIds.length === 0) return;

  let cx = 0, cy = 0;
  for (let id of nodeIds) {
    cx += positions[id].x;
    cy += positions[id].y;
  }
  cx /= nodeIds.length;

  let updates = [];
  edges.forEach((edge) => {
    if (edge.from === edge.to) {
      let pos = positions[edge.from];
      if (pos) {
        // Point outward from center of mass
        let outwardAngle = Math.atan2(pos.y - cy, pos.x - cx);
        // Only update if angle changed enough to avoid infinite update loops
        if (!edge.selfReference || Math.abs(edge.selfReference.angle - outwardAngle) > 0.05) {
          updates.push({
            id: edge.id,
            selfReference: {
              size: 20,
              angle: outwardAngle,
              renderBehindTheNode: false
            }
          });
        }
      }
    }
  });

  if (updates.length > 0) {
    edges.update(updates);
  }
}

/* === Run Simulation === */
function runAutomata() {
  if (document.getElementById("alphabet").value.trim() === "") {
    showAlert("Please enter an alphabet first.");
    return;
  }

  let input = document.getElementById("inputString").value.trim();
  let n = parseInt(document.getElementById("stateCount").value);
  let mode = document.getElementById("mode").value;
  let symbolColumns = getSymbolColumns();

  let transitions = {};
  for (let i = 0; i < n; i++) {
    let state = "q" + i;
    transitions[state] = {};
    for (let symbol of symbolColumns) {
      let inputId = "t_" + i + "_" + symbol;
      let value = document.getElementById(inputId).value.trim();
      if (!value) continue;
      transitions[state][symbol] = value.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  let acceptStates = new Set(
    document
      .getElementById("acceptStates")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  simulationSteps = [];

  if (mode === "nfa") {
    let currentStates = nfaEpsilonClosure(new Set(["q0"]), transitions);
    let stepsTextInfo = "(Start) Active states: " + formatStateSet(currentStates) + "\n";

    simulationSteps.push({
      index: 0,
      states: currentStates,
      logText: stepsTextInfo,
      isFinal: false,
    });

    let rejected = false;
    for (let i = 0; i < input.length; i++) {
      let char = input[i];
      let nextStates = new Set();

      for (let state of currentStates) {
        let targets = transitions[state] && transitions[state][char];
        if (targets) {
          targets.forEach((target) => nextStates.add(target));
        }
      }

      nextStates = nfaEpsilonClosure(nextStates, transitions);

      if (nextStates.size === 0) {
        simulationSteps.push({
          index: i + 1,
          states: currentStates,
          logText:
            stepsTextInfo +
            `⚠ No active transition for input '${char}' from ${formatStateSet(currentStates)}`,
          isFinal: true,
          isAccepted: false,
          isRejected: true,
        });
        rejected = true;
        break;
      }

      stepsTextInfo +=
        "Step " + (i + 1) + ": δ(" +
        formatStateSet(currentStates) + ", " +
        char + ") → " +
        formatStateSet(nextStates) + "\n";

      simulationSteps.push({
        index: i + 1,
        states: nextStates,
        logText: stepsTextInfo,
        isFinal: false,
      });
      currentStates = nextStates;
    }

    if (!rejected) {
      let accepted = Array.from(currentStates).some((state) => acceptStates.has(state));
      simulationSteps.push({
        index: simulationSteps.length,
        states: currentStates,
        logText: stepsTextInfo || "(empty string ε)",
        isFinal: true,
        isAccepted: accepted,
        isRejected: !accepted,
      });
    }
  } else {
    let currentState = "q0";
    let stepsTextInfo = "";

    simulationSteps.push({
      index: 0,
      state: currentState,
      logText: "(Start) Initial State: " + currentState + "\n",
      isFinal: false,
    });

    let stepCount = 1;
    let rejected = false;
    for (let i = 0; i < input.length; i++) {
      let char = input[i];
      if (!transitions[currentState] || !transitions[currentState][char]) {
        simulationSteps.push({
          index: stepCount,
          state: currentState,
          logText: stepsTextInfo +
            "⚠ No transition defined for δ(" + currentState + ", " + char + ")",
          isFinal: true,
          isAccepted: false,
          isRejected: true,
        });
        rejected = true;
        break;
      }

      let nextState = transitions[currentState][char][0];
      stepsTextInfo +=
        "Step " + stepCount + ":  δ(" + currentState + ", " + char + ") → " + nextState + "\n";

      simulationSteps.push({
        index: stepCount,
        state: nextState,
        logText: stepsTextInfo,
        isFinal: false,
      });
      currentState = nextState;
      stepCount++;
    }

    if (!rejected) {
      let accepted = acceptStates.has(currentState);
      simulationSteps.push({
        index: stepCount,
        state: currentState,
        logText: stepsTextInfo || "(empty string ε)",
        isFinal: true,
        isAccepted: accepted,
        isRejected: !accepted,
      });
    }
  }

  playbackMode = "simulating";
  if (drawSteps.length) {
    edges.update(drawSteps);
  }

  let controls = document.getElementById("playback-controls");
  if (controls) controls.style.display = "flex";

  currentStepIndex = 0;
  renderStep(0);
}

function renderStep(index) {
  if (playbackMode === "drawing") {
    let edgesToShow = drawSteps.slice(0, index + 1);
    edges.clear();
    edges.add(edgesToShow);
    document.getElementById("steps").innerText = `Drawing Transitions: ${index} / ${drawSteps.length - 1} edges drawn.`;
    document.getElementById("btn-prev").disabled = (index === 0);
    document.getElementById("btn-next").disabled = (index === drawSteps.length - 1);
    return;
  }

  let step = simulationSteps[index];
  let stepsEl = document.getElementById("steps");
  let outputEl = document.getElementById("output");

  resetNodeColors();

  if (step.states) {
    highlightStates(step.states, step.isFinal ? "final" : "active");
  } else {
    highlightState(step.state, step.isFinal ? "final" : "active");
  }

  stepsEl.innerText = step.logText;

  if (step.isFinal) {
    if (step.isAccepted) {
      outputEl.innerText = "✓ Accepted";
      outputEl.className = "result-badge result-accepted";
    } else {
      outputEl.innerText = "✗ Rejected";
      outputEl.className = "result-badge result-rejected";
    }
  } else {
    outputEl.className = "result-badge";
    outputEl.innerText = "";
  }

  document.getElementById("btn-prev").disabled = (index === 0);
  document.getElementById("btn-next").disabled = (index === simulationSteps.length - 1);
}

window.nextStep = function() {
  let maxSteps = (playbackMode === "drawing") ? drawSteps.length - 1 : simulationSteps.length - 1;
  if (currentStepIndex < maxSteps) {
    currentStepIndex++;
    renderStep(currentStepIndex);
  }
};

window.prevStep = function() {
  if (currentStepIndex > 0) {
    currentStepIndex--;
    renderStep(currentStepIndex);
  }
};

/* === Highlight States === */
function highlightState(state, type) {
  let id = parseInt(state.replace("q", ""));
  let color =
    type === "active"
      ? { background: "rgba(60, 60, 60, 1)", border: "#ffffff" }
      : { background: "rgba(80, 80, 80, 1)", border: "#ffffff" };

  nodes.update({ id, color, borderWidth: 4 });
}

function highlightStates(states, type) {
  let stateList = Array.isArray(states) ? states : Array.from(states || []);
  let updates = stateList
    .filter((state) => /^q\d+$/.test(state))
    .map((state) => {
      return {
        id: parseInt(state.replace("q", "")),
        color: type === "active"
          ? { background: "rgba(60, 60, 60, 1)", border: "#ffffff" }
          : { background: "rgba(80, 80, 80, 1)", border: "#ffffff" },
        borderWidth: 4,
      };
    });

  if (updates.length) {
    nodes.update(updates);
  }
}

/* === Reset node colors === */
function resetNodeColors() {
  let allNodes = nodes.get();
  let acceptInput = document.getElementById("acceptStates").value.trim();
  let acceptSet = new Set(
    acceptInput.split(",").map((s) => s.trim()).filter(Boolean)
  );

  for (let node of allNodes) {
    let isAccept = acceptSet.has(node.label);
    nodes.update({
      id: node.id,
      color: {
        background: isAccept
          ? "rgba(20, 20, 20, 1)"
          : "rgba(10, 10, 10, 1)",
        border: isAccept ? "#ffffff" : "#888888",
      },
      borderWidth: isAccept ? 4 : 2,
    });
  }
}

/* === Toast Alert === */
function showAlert(message) {
  let toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%) translateY(20px)",
    background: "#ffffff",
    color: "#0a0a0a",
    padding: "12px 24px",
    borderRadius: "12px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.85rem",
    fontWeight: "600",
    zIndex: "10000",
    boxShadow: "0 8px 30px rgba(255, 255, 255, 0.15)",
    opacity: "0",
    transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* === Clear diagram on load === */
window.onload = function () {
  document.getElementById("diagram").innerHTML = "";
  nodes = new vis.DataSet([]);
  edges = new vis.DataSet([]);
  network = new vis.Network(container, { nodes, edges }, options);
};

/* ============================================
   REGEX EQUIVALENCE LOGIC
   ============================================ */

function checkRegexEquivalence() {
  let regexStr = document.getElementById("regexInput").value.trim();
  if (!regexStr) {
    showAlert("Please enter a regular expression.");
    return;
  }

  try {
    let nfa1 = regexToNFA(regexStr);
    let nfa2 = getCurrentAutomatonAsNFA();

    let result = areNFAsEquivalent(nfa1, nfa2);

    let steps = document.getElementById("steps");
    let output = document.getElementById("output");

    if (result.equivalent) {
      steps.innerText = "✓ The Regular Expression and the Automaton are equivalent.\nThey represent the same language.";
      output.innerText = "✓ Equivalent";
      output.className = "result-badge result-accepted";
    } else {
      steps.innerText = `✗ Not Equivalent.\nCounter-example: "${result.counterExample || "ε"}"\n(Accepted by ${result.acceptedBy}, Rejected by ${result.rejectedBy})`;
      output.innerText = "✗ Not Equivalent";
      output.className = "result-badge result-rejected";
    }
  } catch (e) {
    showAlert("Error parsing regex: " + e.message);
  }
}

/**
 * Preprocess regex and convert to NFA using Thompson's Construction
 */
function regexToNFA(regex) {
  // Preprocess: add implicit dots and handle basic operators
  // Also treat '+' as union alias for '|'
  let processed = "";
  for (let i = 0; i < regex.length; i++) {
    let c1 = regex[i];
    processed += c1;
    if (i + 1 < regex.length) {
      let c2 = regex[i + 1];
      if (
        c1 !== "(" && c1 !== "|" && c1 !== "+" &&
        c2 !== ")" && c2 !== "|" && c2 !== "+" && c2 !== "*"
      ) {
        processed += ".";
      }
    }
  }

  // Shunting-yard to postfix
  let precedence = { "*": 3, ".": 2, "|": 1, "+": 1 };
  let output = [];
  let stack = [];
  for (let char of processed) {
    if (char === "(") {
      stack.push(char);
    } else if (char === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") output.push(stack.pop());
      stack.pop();
    } else if (precedence[char]) {
      while (stack.length && stack[stack.length - 1] !== "(" && precedence[stack[stack.length - 1]] >= precedence[char]) {
        output.push(stack.pop());
      }
      stack.push(char);
    } else {
      output.push(char);
    }
  }
  while (stack.length) output.push(stack.pop());

  // Thompson's Construction
  let nfaStack = [];
  let stateId = 0;

  function createState() { return { id: stateId++, transitions: {}, epsilonTransitions: [] }; }

  for (let char of output) {
    if (char === "*") {
      let nfa = nfaStack.pop();
      let start = createState(), end = createState();
      start.epsilonTransitions.push(nfa.start, end);
      nfa.end.epsilonTransitions.push(nfa.start, end);
      nfaStack.push({ start, end });
    } else if (char === "|" || char === "+") {
      let b = nfaStack.pop(), a = nfaStack.pop();
      let start = createState(), end = createState();
      start.epsilonTransitions.push(a.start, b.start);
      a.end.epsilonTransitions.push(end);
      b.end.epsilonTransitions.push(end);
      nfaStack.push({ start, end });
    } else if (char === ".") {
      let b = nfaStack.pop(), a = nfaStack.pop();
      a.end.epsilonTransitions.push(b.start);
      nfaStack.push({ start: a.start, end: b.end });
    } else {
      let start = createState(), end = createState();
      if (!start.transitions[char]) start.transitions[char] = [];
      start.transitions[char].push(end);
      nfaStack.push({ start, end });
    }
  }

  let finalNFA = nfaStack.pop();
  return { start: finalNFA.start, acceptStates: new Set([finalNFA.end.id]) };
}

/**
 * Gets the current automaton as an NFA object
 */
function getCurrentAutomatonAsNFA() {
  let n = parseInt(document.getElementById("stateCount").value);
  let alphabet = document.getElementById("alphabet").value.split(",").map(s => s.trim()).filter(Boolean);
  let acceptStates = new Set(document.getElementById("acceptStates").value.split(",").map(s => parseInt(s.trim().replace("q", ""))));

  let nfaStates = [];
  for (let i = 0; i < n; i++) {
    nfaStates.push({ id: i, transitions: {}, epsilonTransitions: [] });
  }

  for (let i = 0; i < n; i++) {
    for (let symbol of alphabet) {
      let val = document.getElementById(`t_${i}_${symbol}`).value.trim();
      if (val) {
        let targets = val.split(",").map(s => parseInt(s.trim().replace("q", "")));
        if (!nfaStates[i].transitions[symbol]) nfaStates[i].transitions[symbol] = [];
        for (let t of targets) {
          if (!isNaN(t)) nfaStates[i].transitions[symbol].push(nfaStates[t]);
        }
      }
    }
  }

  return { start: nfaStates[0], acceptStates };
}

/**
 * Checks equivalence of two NFAs using product reachability
 */
function areNFAsEquivalent(nfa1, nfa2) {
  let alphabet1 = getAlphabet(nfa1);
  let alphabet2 = document.getElementById("alphabet").value.split(",").map(s => s.trim()).filter(Boolean);
  let combinedAlphabet = Array.from(new Set([...alphabet1, ...alphabet2]));

  // BFS on product of Subset-Constructions
  let startSets = [epsilonClosure([nfa1.start]), epsilonClosure([nfa2.start])];
  let visited = new Set();
  let queue = [{ sets: startSets, path: "" }];

  function stateKey(sets) {
    return sets.map(s => Array.from(s).map(st => st.id).sort().join(",")).join("|");
  }

  visited.add(stateKey(startSets));

  while (queue.length) {
    let { sets, path } = queue.shift();
    let [set1, set2] = sets;

    let isAccept1 = Array.from(set1).some(s => nfa1.acceptStates.has(s.id));
    let isAccept2 = Array.from(set2).some(s => nfa2.acceptStates.has(s.id));

    if (isAccept1 !== isAccept2) {
      return {
        equivalent: false,
        counterExample: path,
        acceptedBy: isAccept1 ? "Regex" : "Automaton",
        rejectedBy: isAccept1 ? "Automaton" : "Regex"
      };
    }

    for (let symbol of combinedAlphabet) {
      let nextSet1 = epsilonClosure(move(set1, symbol));
      let nextSet2 = epsilonClosure(move(set2, symbol));
      let nextKey = stateKey([nextSet1, nextSet2]);

      if (!visited.has(nextKey)) {
        visited.add(nextKey);
        queue.push({ sets: [nextSet1, nextSet2], path: path + symbol });
      }
    }

    // Safety break for very large state spaces
    if (visited.size > 5000) break;
  }

  return { equivalent: true };
}

function epsilonClosure(states) {
  let closure = new Set(states);
  let stack = [...states];
  while (stack.length) {
    let s = stack.pop();
    for (let next of s.epsilonTransitions || []) {
      if (!closure.has(next)) {
        closure.add(next);
        stack.push(next);
      }
    }
  }
  return closure;
}

function move(states, symbol) {
  let nextStates = new Set();
  for (let s of states) {
    if (s.transitions && s.transitions[symbol]) {
      for (let target of s.transitions[symbol]) nextStates.add(target);
    }
  }
  return nextStates;
}

function getAlphabet(nfa) {
  let symbols = new Set();
  let visited = new Set();
  let stack = [nfa.start];
  while (stack.length) {
    let s = stack.pop();
    if (visited.has(s)) continue;
    visited.add(s);
    for (let sym in s.transitions) symbols.add(sym);
    for (let sym in s.transitions) stack.push(...s.transitions[sym]);
    stack.push(...(s.epsilonTransitions || []));
  }
  return Array.from(symbols);
}