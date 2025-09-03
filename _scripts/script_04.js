
document.addEventListener("DOMContentLoaded", function() {
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const now = new Date();

  if (dateInput) {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2,"0");
    const dd = String(now.getDate()).padStart(2,"0");
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  if (timeInput) {
    const hh = String(now.getHours()).padStart(2,"0");
    const mm2 = String(now.getMinutes()).padStart(2,"0");
    timeInput.value = `${hh}:${mm2}`;
  }
});
