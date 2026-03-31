/* ============================================
   Automata Simulator — Script (Monochrome)
   ============================================ */

var container = document.getElementById("diagram");
var nodes, edges, network;

/* === vis-network monochrome options === */
var options = {
  edges: {
    arrows: "to",
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
    },
    width: 2,
    hoverWidth: 3,
    smooth: {
      type: "curvedCW",
      roundness: 0.2,
    },
  },
  nodes: {
    shape: "circle",
    size: 30,
    font: {
      color: "#e0e0e0",
      size: 15,
      face: "Inter, sans-serif",
      bold: { color: "#ffffff" },
    },
    color: {
      background: "rgba(255, 255, 255, 0.06)",
      border: "#888888",
      highlight: {
        background: "rgba(255, 255, 255, 0.15)",
        border: "#ffffff",
      },
      hover: {
        background: "rgba(255, 255, 255, 0.1)",
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
    stabilization: { iterations: 150 },
    barnesHut: {
      gravitationalConstant: -3000,
      springLength: 180,
      springConstant: 0.04,
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

  let nodeList = [];
  for (let i = 0; i < n; i++) {
    let label = "q" + i;
    let isAccept = acceptSet.has(label);

    nodeList.push({
      id: i,
      label: label,
      borderWidth: isAccept ? 4 : 2,
      color: {
        background: isAccept
          ? "rgba(255, 255, 255, 0.12)"
          : "rgba(255, 255, 255, 0.06)",
        border: isAccept ? "#ffffff" : "#888888",
      },
    });
  }

  nodes = new vis.DataSet(nodeList);
  network = new vis.Network(container, { nodes, edges: [] }, options);

  let alphabet = document.getElementById("alphabet").value.split(",").map(s => s.trim()).filter(Boolean);

  let table = "<table><tr><th>State</th>";
  for (let symbol of alphabet) {
    table += "<th>" + symbol + "</th>";
  }
  table += "</tr>";

  for (let i = 0; i < n; i++) {
    table += "<tr><td>q" + i + "</td>";
    for (let symbol of alphabet) {
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
  let alphabet = document.getElementById("alphabet").value.split(",").map(s => s.trim()).filter(Boolean);

  let edgeList = [];

  for (let i = 0; i < n; i++) {
    for (let symbol of alphabet) {
      let inputId = "t_" + i + "_" + symbol;
      let value = document.getElementById(inputId).value.trim();
      let mode = document.getElementById("mode").value;

      if (mode === "dfa") {
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
        let targets = value.split(",").map((s) => s.trim());
        for (let t of targets) {
          // Validation: must start with 'q' followed by digits
          if (!/^q\d+$/.test(t)) {
            showAlert(`Invalid state format: "${t}". Use "q0", "q1", etc.`);
            return;
          }

          let targetId = parseInt(t.replace("q", ""));
          if (targetId < 0 || targetId >= n) {
            showAlert(`State "q${targetId}" does not exist. Max state is "q${n - 1}".`);
            return;
          }

          edgeList.push({
            from: i,
            to: targetId,
            label: symbol,
          });
        }
      }
    }
  }

  edges = new vis.DataSet(edgeList);
  network.setData({ nodes, edges });
}

/* === Run Simulation === */
function runAutomata() {
  if (document.getElementById("alphabet").value.trim() === "") {
    showAlert("Please enter an alphabet first.");
    return;
  }

  let input = document.getElementById("inputString").value.trim();
  let n = parseInt(document.getElementById("stateCount").value);
  let alphabet = document.getElementById("alphabet").value.split(",").map(s => s.trim()).filter(Boolean);

  let transitions = {};
  for (let i = 0; i < n; i++) {
    let state = "q" + i;
    transitions[state] = {};
    for (let symbol of alphabet) {
      let inputId = "t_" + i + "_" + symbol;
      let value = document.getElementById(inputId).value.trim();
      transitions[state][symbol] = value;
    }
  }

  let currentState = "q0";
  let stepsEl = document.getElementById("steps");
  let outputEl = document.getElementById("output");
  let steps = "";
  let stepCount = 1;

  resetNodeColors();
  highlightState(currentState, "active");

  for (let char of input) {
    if (!transitions[currentState] || !transitions[currentState][char]) {
      stepsEl.innerText = "⚠ No transition defined for δ(" + currentState + ", " + char + ")";
      outputEl.innerText = "✗ Rejected";
      outputEl.className = "result-badge result-rejected";
      return;
    }

    let nextState = transitions[currentState][char];
    steps += "Step " + stepCount + ":  δ(" + currentState + ", " + char + ") → " + nextState + "\n";
    currentState = nextState;
    stepCount++;
  }

  stepsEl.innerText = steps || "(empty string ε)";
  highlightState(currentState, "final");

  let acceptStates = document
    .getElementById("acceptStates")
    .value.split(",")
    .map((s) => s.trim());
  let accepted = acceptStates.includes(currentState);

  if (accepted) {
    outputEl.innerText = "✓ Accepted";
    outputEl.className = "result-badge result-accepted";
  } else {
    outputEl.innerText = "✗ Rejected";
    outputEl.className = "result-badge result-rejected";
  }
}

/* === Highlight State === */
function highlightState(state, type) {
  let id = parseInt(state.replace("q", ""));
  let color =
    type === "active"
      ? { background: "rgba(255, 255, 255, 0.2)", border: "#ffffff" }
      : { background: "rgba(255, 255, 255, 0.25)", border: "#ffffff" };

  nodes.update({ id, color, borderWidth: 4 });
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
          ? "rgba(255, 255, 255, 0.12)"
          : "rgba(255, 255, 255, 0.06)",
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