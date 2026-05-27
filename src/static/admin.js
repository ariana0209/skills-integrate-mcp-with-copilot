document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("#activities-table tbody");
  const messageDiv = document.getElementById("admin-message");
  const reportSelect = document.getElementById("report-activity");
  const exportBtn = document.getElementById("export-csv");

  async function fetchActivities() {
    try {
      const res = await fetch("/activities");
      const activities = await res.json();

      tableBody.innerHTML = "";
      reportSelect.innerHTML = '<option value="">-- Select activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const tr = document.createElement("tr");

        const participantsHtml = details.participants.length
          ? details.participants.map(e => `<div>${e}</div>`).join("")
          : "<em>No participants</em>";

        tr.innerHTML = `
          <td>${name}</td>
          <td>${details.description}</td>
          <td>${details.schedule}</td>
          <td>${participantsHtml}</td>
          <td>
            <button class="action-btn" data-activity="${encodeURIComponent(name)}">Remove all</button>
          </td>
        `;

        tableBody.appendChild(tr);

        // Add to reports select
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        reportSelect.appendChild(opt);
      });

      // Hook up remove-all buttons
      document.querySelectorAll(".action-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const activity = decodeURIComponent(btn.getAttribute("data-activity"));
          if (!confirm(`Remove ALL participants from ${activity}?`)) return;

          // Remove each participant sequentially
          const row = btn.closest("tr");
          const participants = Array.from(row.querySelectorAll("td:nth-child(4) div")).map(d => d.textContent);

          for (const email of participants) {
            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              // ignore per-user errors and continue
            } catch (err) {
              console.error("Error removing", email, err);
            }
          }

          showMessage(`Removed ${participants.length} participant(s) from ${activity}`, 'info');
          fetchActivities();
        });
      });
    } catch (err) {
      console.error(err);
      showMessage('Failed to load activities', 'error');
    }
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove('hidden');
    setTimeout(() => messageDiv.classList.add('hidden'), 4000);
  }

  exportBtn.addEventListener('click', () => {
    const activity = reportSelect.value;
    if (!activity) return showMessage('Select an activity first', 'error');

    // Fetch current activities to build CSV
    fetch('/activities')
      .then(r => r.json())
      .then(data => {
        const list = data[activity]?.participants || [];
        const csv = ['email'].concat(list).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activity.replace(/\s+/g,'_')}_roster.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error(err);
        showMessage('Failed to build report', 'error');
      });
  });

  fetchActivities();
});
