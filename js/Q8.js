(async function () {
  // Đọc dữ liệu
  const raw = await d3.csv("../data/data_ggsheet.csv", d => ({
    maDon: d["Mã đơn hàng"],
    maNhom: d["Mã nhóm hàng"],
    tenNhom: d["Tên nhóm hàng"],
    time: new Date(d["Thời gian tạo đơn"])
  }));

  // Tháng (1-12)
  const monthNames = [
    "Tháng 01","Tháng 02","Tháng 03","Tháng 04","Tháng 05","Tháng 06",
    "Tháng 07","Tháng 08","Tháng 09","Tháng 10","Tháng 11","Tháng 12"
  ];

  // Tính xác suất bán = (COUNTD mã đơn theo nhóm hàng, tháng) / (COUNTD mã đơn theo tháng)
  const grouped = d3.rollups(
    raw,
    v => {
      const uniqueOrders = new Set(v.map(d => d.maDon)).size;
      return { soDonBan: uniqueOrders };
    },
    d => d.time.getMonth(),  // theo tháng (0–11)
    d => `[${d.maNhom}] ${d.tenNhom}`
  );

  // Tính tổng đơn hàng theo tháng (mẫu số)
  const totalByMonth = d3.rollups(
    raw,
    v => new Set(v.map(d => d.maDon)).size,
    d => d.time.getMonth()
  );
  const totalMap = new Map(totalByMonth);

  // Chuẩn hóa dữ liệu dạng {month, nhom, xacsuat, soDonBan}
  const data = [];
  grouped.forEach(([month, arr]) => {
    arr.forEach(([nhom, val]) => {
      data.push({
        month,
        thang: monthNames[month],
        nhom,
        soDonBan: val.soDonBan,
        xacsuat: +(val.soDonBan / totalMap.get(month) * 100).toFixed(1)
      });
    });
  });

  // Trục
  const margin = { top: 50, right: 100, bottom: 60, left: 70 };
  const svgW = 1100, svgH = 600;
  const width = svgW - margin.left - margin.right;
  const height = svgH - margin.top - margin.bottom;

  const svg = d3.select("#chart")
    .attr("width", svgW)
    .attr("height", svgH)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint()
    .domain(monthNames)
    .range([0, width])
    .padding(0.5);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.xacsuat)]).nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal(d3.schemeTableau10)
    .domain([...new Set(data.map(d => d.nhom))]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d + "%"));

  // Tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Nhóm dữ liệu theo Nhóm hàng để vẽ nhiều line
  const nested = d3.group(data, d => d.nhom);

  const line = d3.line()
    .x(d => x(d.thang))
    .y(d => y(d.xacsuat));

  nested.forEach((values, key) => {
    svg.append("path")
      .datum(values.sort((a, b) => a.month - b.month))
      .attr("fill", "none")
      .attr("stroke", color(key))
      .attr("stroke-width", 2)
      .attr("d", line);

    // Vẽ điểm tròn
    svg.selectAll(".point-" + key)
      .data(values)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.thang))
      .attr("cy", d => y(d.xacsuat))
      .attr("r", 4)
      .attr("fill", color(key))
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <b>Nhóm hàng:</b> ${d.nhom}<br/>
          <b>Tháng:</b> ${d.thang}<br/>
          <b>Xác suất bán:</b> ${d.xacsuat}%<br/>
          <b>Số lượng bán:</b> ${d3.format(",")(d.soDonBan)}
        `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));
  });

  // Title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .style("fill", "#2563eb")
    .text("Xác suất bán hàng của Nhóm hàng theo Tháng");
})();
