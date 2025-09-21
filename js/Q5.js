// FILE: js/q5.js
(async function () {
    const tryParsers = [
      d3.timeParse("%Y-%m-%d %H:%M:%S"),
      d3.timeParse("%Y-%m-%dT%H:%M:%S"),
      d3.timeParse("%d/%m/%Y %H:%M:%S"),
      d3.timeParse("%d/%m/%Y %H:%M"),
      d3.timeParse("%d/%m/%Y"),
      d3.timeParse("%Y-%m-%d")
    ];
    function parseDateFlexible(s) {
      if (!s) return null;
      s = String(s).trim();
      if (!s) return null;
      for (const p of tryParsers) {
        const dt = p(s);
        if (dt && !isNaN(dt)) return dt;
      }
      const dt2 = new Date(s);
      return isNaN(dt2) ? null : dt2;
    }
    function toNumber(s) {
      if (s == null || s === "") return 0;
      return +String(s).replace(/[^0-9\.\-]+/g, "") || 0;
    }
  
    // Load CSV
    let raw;
    try {
      raw = await d3.csv("../data/data_ggsheet.csv");
    } catch (err) {
      console.error("CSV load error:", err);
      d3.select("#chart").append("text").text("Không thể load file CSV");
      return;
    }
  
    const fmtYMD = d3.timeFormat("%Y-%m-%d");
    const rows = raw.map(r => {
      const date = parseDateFlexible(r["Thời gian tạo đơn"] ?? r["Thời gian"]);
      return {
        date,
        sl: toNumber(r["SL"] ?? r["Số lượng"]),
        thanhtien: toNumber(r["Thành tiền"] ?? r["Doanh số"])
      };
    }).filter(d => d.date && !isNaN(d.date));
  
    if (!rows.length) {
      d3.select("#chart").append("text").text("Không có dữ liệu hợp lệ");
      return;
    }
  
    // Group by day of month
    const grouped = d3.rollups(
      rows,
      v => {
        const sumTien = d3.sum(v, d => d.thanhtien);
        const sumSL = d3.sum(v, d => d.sl);
        const uniqueDays = new Set(v.map(d => fmtYMD(d.date))).size;
        const avgTien = uniqueDays ? sumTien / uniqueDays : 0;
        const avgSL = uniqueDays ? sumSL / uniqueDays : 0;
        return { avgTien, avgSL };
      },
      d => d.date.getDate()
    );
  
    const data = grouped.map(([day, vals]) => ({
      day,
      label: `Ngày ${day.toString().padStart(2, "0")}`,
      doanhsoTr: Math.round((vals.avgTien / 1_000_000) * 10) / 10, // triệu VND, 1 decimal
      slTB: vals.avgSL
    })).sort((a, b) => a.day - b.day);
  
    // Chart setup
    const margin = { top: 50, right: 30, bottom: 80, left: 70 };
    const svgW = 1100, svgH = 600;
    const width = svgW - margin.left - margin.right;
    const height = svgH - margin.top - margin.bottom;
  
    const root = d3.select("#chart");
    root.selectAll("*").remove();
    root.attr("width", svgW).attr("height", svgH);
    const svg = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, width]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.doanhsoTr)]).nice().range([height, 0]);
    const color = d3.scaleOrdinal(d3.schemeTableau10);
  
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-65)")
      .style("text-anchor", "end");
  
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => d + " tr"));
  
    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(255,255,255,0.95)")
      .style("padding", "8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "6px")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
      .style("visibility", "hidden")
      .style("font-size", "13px")
      .style("color", "#000");
  
    // Bars
    svg.selectAll("rect.bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.label))
      .attr("y", d => y(d.doanhsoTr))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.doanhsoTr))
      .attr("fill", d => color(d.day))
      .on("mouseover", (event, d) => {
        tooltip.style("visibility", "visible")
          .html(`<strong>${d.label}</strong><br/>
                 Doanh số bán TB: ${d.doanhsoTr} triệu VND<br/>
                 Số lượng bán TB: ${d3.format(",")(Math.round(d.slTB))} SKUs`);
      })
      .on("mousemove", event => {
        tooltip.style("top", (event.pageY - 40) + "px")
               .style("left", (event.pageX + 12) + "px");
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"));
  
    // Labels
    svg.selectAll("text.bar-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d.label) + x.bandwidth() / 2)
      .attr("y", d => y(d.doanhsoTr) - 6)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", "#111827")
      .text(d => d.doanhsoTr ? d.doanhsoTr + " tr" : "");
  
    // Title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "700")
      .style("fill", "#2563eb")
      .text("Doanh số bán hàng trung bình theo Ngày trong tháng");
  
  })();
  