import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

async function loadData() {
  const data = await d3.csv("loc.csv", (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];

      const { author, date, time, timezone, datetime } = first;

      const commitData = {
        id: commit,
        url: `https://github.com/alexphan1128/portfolio/commit/${commit}`,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(commitData, "lines", {
        value: lines,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      return commitData;
    })
    // Step 3.3: keep commits in chronological order so the story reads in order
    .sort((a, b) => a.datetime - b.datetime);
}

// Step 1.2 exercise: stats are recomputed from whichever commits are visible.
// The <dl> is cleared and refilled instead of appending a new one each time.
function renderCommitInfo(data, commits) {
  const container = d3.select("#stats");
  container.selectAll("*").remove();

  const stats = container.append("dl").attr("class", "stats");

  const fileCount = d3.group(data, (d) => d.file).size;
  const longestLine = d3.greatest(data, (d) => d.length);
  const averageLineLength = d3.mean(data, (d) => d.length);
  const maxDepth = d3.max(data, (d) => d.depth);

  stats.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>');
  stats.append("dd").text(data.length);

  stats.append("dt").text("Total commits");
  stats.append("dd").text(commits.length);

  stats.append("dt").text("Number of files");
  stats.append("dd").text(fileCount);

  stats.append("dt").text("Longest line");
  stats.append("dd").text(longestLine ? `${longestLine.length} chars` : "—");

  stats.append("dt").text("Avg line length");
  stats
    .append("dd")
    .text(averageLineLength ? `${averageLineLength.toFixed(1)} chars` : "—");

  stats.append("dt").text("Max depth");
  stats.append("dd").text(maxDepth ?? "—");
}

function renderTooltipContent(commit) {
  const link = document.querySelector("#commit-link");
  const date = document.querySelector("#commit-date");
  const author = document.querySelector("#commit-author");
  const lines = document.querySelector("#commit-lines");

  link.href = commit.url;
  link.textContent = commit.id;

  date.textContent = commit.datetime.toLocaleString("en", {
    dateStyle: "full",
    timeStyle: "short",
  });

  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.querySelector("#commit-tooltip");
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.querySelector("#commit-tooltip");

  tooltip.style.left = `${event.clientX + 15}px`;
  tooltip.style.top = `${event.clientY + 15}px`;
}

let xScale;
let yScale;
let rScale;
let usableArea;
let commits = [];
let filteredCommits = [];

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }

  const [[x0, y0], [x1, y1]] = selection;

  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter((commit) => isCommitSelected(selection, commit))
    : [];

  const countElement = document.querySelector("#selection-count");

  countElement.textContent = selectedCommits.length
    ? `${selectedCommits.length} commits selected`
    : "No commits selected";

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter((commit) => isCommitSelected(selection, commit))
    : [];

  const container = document.querySelector("#language-breakdown");

  container.innerHTML = "";

  if (selectedCommits.length === 0) {
    return;
  }

  const lines = selectedCommits.flatMap((commit) => commit.lines);

  const breakdown = d3.rollup(
    lines,
    (values) => values.length,
    (line) => line.type,
  );

  for (const [language, count] of breakdown) {
    const percentage = count / lines.length;

    container.innerHTML += `
      <dt>${language}</dt>
      <dd>
        ${count} lines
        (${d3.format(".1%")(percentage)})
      </dd>
    `;
  }
}

function brushed(event) {
  const selection = event.selection;

  d3.selectAll("#chart circle").classed("selected", (commit) =>
    isCommitSelected(selection, commit),
  );

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

// Shared by renderScatterPlot and updateScatterPlot so both draw circles
// the same way. The key function (d => d.id) keeps each circle tied to the
// same commit across updates (Step 1.3).
function drawDots(svg, commits) {
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  svg
    .select("g.dots")
    .selectAll("circle")
    .data(sortedCommits, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .style("--r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);

      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);

      updateTooltipVisibility(false);
    });
}

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const margin = {
    top: 20,
    right: 20,
    bottom: 50,
    left: 60,
  };

  usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const xAxis = d3.axisBottom(xScale).ticks(6);

  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => `${String(d % 24).padStart(2, "0")}:00`);

  svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));

  // Step 1.2: class so updateScatterPlot can find and redraw it
  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // Radius scale is based on ALL commits so a commit's dot size never
  // changes while filtering.
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

  rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([4, 25]);

  const brush = d3
    .brush()
    .extent([
      [usableArea.left, usableArea.top],
      [usableArea.right, usableArea.bottom],
    ])
    .on("start brush end", brushed);

  svg.call(brush);

  svg.append("g").attr("class", "dots");
  drawDots(svg, commits);

  svg.select("g.dots").raise();
}

// Step 1.2: reuse the existing SVG instead of creating a new one
function updateScatterPlot(data, commits) {
  const svg = d3.select("#chart").select("svg");

  if (commits.length > 0) {
    xScale.domain(d3.extent(commits, (d) => d.datetime)).nice();
  }

  const xAxis = d3.axisBottom(xScale).ticks(6);

  const xAxisGroup = svg.select("g.x-axis");
  xAxisGroup.selectAll("*").remove();
  xAxisGroup.call(xAxis);

  drawDots(svg, commits);
}

// Step 2: unit visualization of lines per file
const colors = d3.scaleOrdinal(d3.schemeTableau10);

function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap((d) => d.lines);

  // Step 2.3: biggest files first
  const files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines, type: lines[0].type }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select("#files")
    .selectAll("div")
    .data(files, (d) => d.name)
    .join(
      (enter) =>
        enter.append("div").call((div) => {
          const dt = div.append("dt");
          dt.append("code");
          dt.append("small");
          div.append("dd");
        }),
    );

  filesContainer.select("dt > code").text((d) => d.name);
  filesContainer.select("dt > small").text((d) => `${d.lines.length} lines`);

  // Step 2.2 + 2.4: one dot per line, colored by technology
  filesContainer
    .select("dd")
    .selectAll("div")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc")
    .attr("style", (d) => `--color: ${colors(d.type)}`);
}

// ---------- Main ----------

const data = await loadData();
commits = processCommits(data);
filteredCommits = commits;

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

// Step 1.1: slider state
let commitProgress = 100;

const timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

const slider = document.getElementById("commit-progress");
const timeElement = document.getElementById("commit-time");

// One function that every control (slider or scroll) goes through
function updateAll() {
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  timeElement.textContent = commitMaxTime.toLocaleString("en", {
    dateStyle: "long",
    timeStyle: "short",
  });

  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(
    filteredCommits.flatMap((d) => d.lines),
    filteredCommits,
  );
  updateFileDisplay(filteredCommits);
}

function onTimeSliderChange() {
  commitProgress = Number(slider.value);
  commitMaxTime = timeScale.invert(commitProgress);
  updateAll();
}

slider.addEventListener("input", onTimeSliderChange);
onTimeSliderChange();

// Step 3.2: one story step per commit
d3.select("#scatter-story")
  .selectAll(".step")
  .data(commits)
  .join("div")
  .attr("class", "step")
  .html((d, i) => {
    const fileCount = d3.rollups(
      d.lines,
      (D) => D.length,
      (d) => d.file,
    ).length;

    return `
      <p>
        On ${d.datetime.toLocaleString("en", {
          dateStyle: "full",
          timeStyle: "short",
        })},
        I made <a href="${d.url}" target="_blank" rel="noopener noreferrer">${
          i > 0 ? "another glorious commit" : "my first commit, and it was glorious"
        }</a>.
        I edited ${d.totalLines} lines across ${fileCount} file${
          fileCount === 1 ? "" : "s"
        }.
        Then I looked over all I had made, and I saw that it was very good.
      </p>
    `;
  });

// Step 3.3: scrolling drives the same update as the slider
function onStepEnter(response) {
  commitMaxTime = response.element.__data__.datetime;

  // keep the slider in sync with the scroll position
  commitProgress = timeScale(commitMaxTime);
  slider.value = commitProgress;

  updateAll();
}

const scroller = scrollama();

scroller
  .setup({
    container: "#scrolly-1",
    step: "#scrolly-1 .step",
  })
  .onStepEnter(onStepEnter);

window.addEventListener("resize", () => scroller.resize());