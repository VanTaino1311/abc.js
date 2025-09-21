(async function () {
  // Load file CSV từ GitHub Pages (đường dẫn tuyệt đối)
  const rawData = await d3.csv("https://vantaino1311.github.io/abc.js/data/data_ggsheet.csv", d => ({
    maHang: d["Mã mặt hàng"],
    tenHang: d["Tên mặt hàng"],
    maNhom: d["Mã nhóm hàng"],
    tenNhom: d["Tên nhóm hàng"],
    sl: +d["SL"],
    thanhtien: +d["Thành tiền"]
  }));

  // Gom nhóm theo mã hàng
  const agg = d3.rollups(
    rawData,
    v => ({
      maHang: v[0].maHang,
      tenHang: v[0].tenHang,
      maNhom: v[0].maNhom,
      tenNhom: v[0].tenNhom,
      sl: d3.sum(v, d => d.sl),
      thanhtien: d3.sum(v, d => d.thanhtien)
    }),
    d => d.maHang
  ).map(([_, val]) => val);

  // Sắp xếp giảm dần theo doanh số
  agg.sort((a, b) => d3.descending(a.thanhtien, b.thanhtien));

  const margin = { top: 50, right: 220, bottom: 60, left: 300 };
  const svgWidth = 1100, svgHeight = 650;
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const svg = d3.select("#chart")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scale
  const x = d3.scaleLinear()
    .domain([0, d3.max(agg, d => d.thanhtien)]).nice()
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(agg.map(d => `[${d.maHang}] ${d.tenHang}`))
    .range([0, height])
    .padding(0.2);

  const color = d3.scaleOrdinal(d3.schemeTableau10)
    .domain([...new Set(agg.map(d => `[${d.maNhom}] ${d.tenNhom}`))]);

  // Axes
  svg.append("g")
    .call(d3.axisLeft(y).tickSize(0).tickPadding(6));

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format(".2s")));

  // Tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Bars
  svg.selectAll("rect")
    .data(agg)
    .enter()
    .append("rect")
    .attr("y", d => y(`[${d.maHang}] ${d.tenHang}`))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.thanhtien))
    .attr("fill", d => color(`[${d.maNhom}] ${d.tenNhom}`))
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`
        <b>Mặt hàng:</b> [${d.maHang}] ${d.tenHang}<br/>
        <b>Nhóm hàng:</b> [${d.maNhom}] ${d.tenNhom}<br/>
        <b>Số lượng bán:</b> ${d3.format(",")(d.sl)}<br/>
        <b>Doanh số bán:</b> ${Math.round(d.thanhtien / 1e6)} Triệu VND
      `)
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 28) + "px");
    })
    .on("mousemove", function (event) {
      tooltip.style("left", (event.pageX + 15) + "px")
             .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(300).style("opacity", 0);
    });

  // Label giá trị trên bar
  svg.selectAll(".label")
    .data(agg)
    .enter()
    .append("text")
    .attr("x", d => x(d.thanhtien) + 5)
    .attr("y", d => y(`[${d.maHang}] ${d.tenHang}`) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text(d => `${Math.round(d.thanhtien / 1e6)} Triệu VND`)
    .style("font-size", "12px")
    .style("fill", "#111827");

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width + 40}, 0)`);

  const groups = color.domain();
  groups.forEach((g, i) => {
    const row = legend.append("g")
      .attr("transform", `translate(0, ${i * 22})`);
    row.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color(g));
    row.append("text")
      .attr("x", 22)
      .attr("y", 12)
      .text(g)
      .style("font-size", "13px");
  });

  // Title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("fill", "#1f2937")
    .style("font-weight", "bold")
    .text("Doanh số bán hàng theo mặt hàng");
})();
