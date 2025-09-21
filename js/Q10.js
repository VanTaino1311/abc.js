(async function () {
    // --- Helpers: parse date flexible
    const tryParsers = [
      d3.timeParse("%Y-%m-%d %H:%M:%S"),
      d3.timeParse("%Y-%m-%dT%H:%M:%S"),
      d3.timeParse("%d/%m/%Y %H:%M:%S"),
      d3.timeParse("%d/%m/%Y %H:%M"),
      d3.timeParse("%d/%m/%Y"),
      d3.timeParse("%Y-%m-%d")
    ];
    function parseDateFlexible(s) {
      if (!s && s !== 0) return null;
      s = String(s).trim();
      if (!s) return null;
      for (const p of tryParsers) {
        try {
          const dt = p(s);
          if (dt && !isNaN(dt)) return dt;
        } catch (e) {}
      }
      const dt2 = new Date(s);
      return isNaN(dt2) ? null : dt2;
    }
  
    // --- Load CSV
    const rowsRaw = await d3.csv("../data/data_ggsheet.csv");
  
    // months mapping and labels
    const monthLabels = ["T01","T02","T03","T04","T05","T06","T07","T08","T09","T10","T11","T12"];
  
    // --- Normalize rows and filter invalid
    const rows = rowsRaw.map(r => {
      const d = parseDateFlexible(r["Thời gian tạo đơn"] ?? r["Thời gian tạo đơn "]);
      return {
        maDon: (r["Mã đơn hàng"] ?? r["Ma don"] ?? "").trim(),
        maNhom: (r["Mã nhóm hàng"] ?? r["Mã nhóm hàng "] ?? "").trim(),
        tenNhom: (r["Tên nhóm hàng"] ?? "").trim(),
        maHang: (r["Mã mặt hàng"] ?? "").trim(),
        tenHang: (r["Tên mặt hàng"] ?? "").trim(),
        date: d
      };
    }).filter(d => d.maDon && d.date instanceof Date && !isNaN(d.date));
  
    // --- Build sets: group->(item->(monthIndex->Set of orders)), and group->(month->Set of orders)
    const groupItemMonth = new Map(); // Map<group, Map<item, Map<monthIndex, Set>>>
    const groupMonth = new Map();     // Map<group, Map<monthIndex, Set>>
  
    rows.forEach(r => {
      const group = `[${r.maNhom}] ${r.tenNhom}`;
      const item = `[${r.maHang}] ${r.tenHang}`;
      const m = r.date.getMonth(); // 0..11
  
      // groupMonth
      if (!groupMonth.has(group)) groupMonth.set(group, new Map());
      const gm = groupMonth.get(group);
      if (!gm.has(m)) gm.set(m, new Set());
      gm.get(m).add(r.maDon);
  
      // groupItemMonth
      if (!groupItemMonth.has(group)) groupItemMonth.set(group, new Map());
      const imap = groupItemMonth.get(group);
      if (!imap.has(item)) imap.set(item, new Map());
      const monthMap = imap.get(item);
      if (!monthMap.has(m)) monthMap.set(m, new Set());
      monthMap.get(m).add(r.maDon);
    });
  
    // --- Build flat dataframe with full 12 months per item (fills zero where missing)
    const df = []; // {nhom, hang, monthIndex, thang, soDon, xacsuat}
    for (const [group, itemsMap] of groupItemMonth.entries()) {
      for (const [item, monthMap] of itemsMap.entries()) {
        for (let mi = 0; mi < 12; mi++) {
          const numeratorSet = monthMap.get(mi);
          const numerator = numeratorSet ? numeratorSet.size : 0;
          const denomSet = (groupMonth.get(group) || new Map()).get(mi);
          const denom = denomSet ? denomSet.size : 0;
          const pct = denom > 0 ? +(numerator / denom * 100).toFixed(1) : 0.0;
          df.push({
            nhom: group,
            hang: item,
            monthIndex: mi,
            thang: monthLabels[mi],
            soDon: numerator,
            xacsuat: pct
          });
        }
      }
    }
  
    // If df empty, show message
    if (df.length === 0) {
      d3.select("#dashboard").append("div").text("Không tìm thấy dữ liệu hợp lệ để vẽ Q10.");
      return;
    }
  
    // --- Tooltip (single)
    const tooltip = d3.select("body").append("div")
      .attr("class","tooltip")
      .style("opacity",0)
      .style("position","absolute")
      .style("background","#fff")
      .style("border","1px solid #bbb")
      .style("padding","8px")
      .style("border-radius","6px")
      .style("font-size","13px")
      .style("pointer-events","none")
      .style("color","#000")
      .style("z-index",9999);
  
    // --- Dashboard groups (explicit order)
    const nhomList = ["[BOT] Bột","[SET] Set trà","[THO] Trà hoa","[TMX] Trà mix","[TTC] Trà củ, quả sấy"];
    const dashboard = d3.select("#dashboard");
    dashboard.selectAll("*").remove();
  
    nhomList.forEach(nhom => {
      const groupData = df.filter(d => d.nhom === nhom);
      if (groupData.length === 0) {
        // render placeholder box still
        dashboard.append("div").attr("class","chart-container")
          .style("min-height","120px")
          .append("p").text(nhom + " — Không có dữ liệu");
        return;
      }
  
      // compute y domain for this group (max across items)
      const yMax = d3.max(groupData, d => d.xacsuat);
  
      // setup container & svg
      const container = dashboard.append("div").attr("class","chart-container")
        .style("background","#fff").style("padding","8px").style("border","1px solid #eee");
  
      container.append("h3").style("text-align","center").style("color","#1f4e79").text(nhom);
  
      const svgW = 420, svgH = 300;
      const margin = {top: 28, right: 14, bottom: 36, left: 52};
      const width = svgW - margin.left - margin.right;
      const height = svgH - margin.top - margin.bottom;
  
      const svg = container.append("svg").attr("width", svgW).attr("height", svgH)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
      const x = d3.scalePoint().domain(monthLabels).range([0, width]).padding(0.5);
      const y = d3.scaleLinear().domain([0, Math.max(5, yMax)]).nice().range([height, 0]); // ensure some headroom
  
      svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
      svg.append("g").call(d3.axisLeft(y).tickFormat(d => d + "%"));
  
      // color scale by item
      const items = Array.from(new Set(groupData.map(d => d.hang)));
      const color = d3.scaleOrdinal().domain(items).range(d3.schemeTableau10);
  
      // nest by item and ensure series sorted by monthIndex
      const nested = d3.group(groupData, d => d.hang);
  
      const line = d3.line()
        .defined(d => d != null)
        .x(d => x(d.thang))
        .y(d => y(d.xacsuat))
        .curve(d3.curveMonotoneX);
  
      // draw lines
      for (const [item, series] of nested.entries()) {
        const s = series.slice().sort((a,b) => a.monthIndex - b.monthIndex);
        svg.append("path")
          .datum(s)
          .attr("fill","none")
          .attr("stroke", color(item))
          .attr("stroke-width", 2)
          .attr("d", line)
          .attr("opacity", 0.95);
        // dots
        svg.selectAll(`.dot-${CSS.escape(item)}`)
          .data(s)
          .enter()
          .append("circle")
          .attr("class", "dot")
          .attr("cx", d => x(d.thang))
          .attr("cy", d => y(d.xacsuat))
          .attr("r", 3)
          .attr("fill", color(item))
          .on("mouseover", (event, d) => {
            tooltip.transition().duration(120).style("opacity",1);
            tooltip.html(
              `<b>Mặt hàng:</b> ${d.hang}<br/>
               <b>Nhóm hàng:</b> ${d.nhom}<br/>
               <b>Tháng:</b> ${d.thang}<br/>
               <b>SL Đơn Bán:</b> ${d3.format(",")(d.soDon)}<br/>
               <b>Xác suất Bán/ Nhóm hàng:</b> ${d.xacsuat.toFixed(1)}%`
            )
            .style("left", (event.pageX + 14) + "px")
            .style("top", (event.pageY - 36) + "px");
          })
          .on("mousemove", (event)=> {
            tooltip.style("left", (event.pageX + 14) + "px")
                   .style("top", (event.pageY - 36) + "px");
          })
          .on("mouseout", () => tooltip.transition().duration(120).style("opacity",0));
      }
  
      // small legend (horizontal, trimmed)
      const legend = container.append("div").style("display","flex").style("flex-wrap","wrap").style("gap","6px").style("margin-top","6px");
      items.slice(0, 10).forEach(it => {
        const leg = legend.append("div").style("display","flex").style("align-items","center").style("gap","6px").style("font-size","12px");
        leg.append("div").style("width","12px").style("height","12px").style("background", color(it));
        leg.append("div").text(it).style("color","#333");
      });
  
    }); // end nhomList loop
  })();
  