const fields = [
    "dailyHours",
    "lunchTime",
    "startWork",
    "lunchStart",
    "lunchEnd",
    "returnWork",
    "extraHours"
];

function saveData() {
    fields.forEach(id => {
        localStorage.setItem(id, document.getElementById(id).value);
    });
}

function loadData() {
    fields.forEach(id => {
        const value = localStorage.getItem(id);
        if (value) {
            document.getElementById(id).value = value;
        }
    });
}

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hrs = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;

    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function calculateExitTime() {
    const dailyHours = document.getElementById("dailyHours").value;
    const startWork = document.getElementById("startWork").value;
    const lunchStart = document.getElementById("lunchStart").value;
    const lunchEnd = document.getElementById("lunchEnd").value;
    const returnWork = document.getElementById("returnWork").value;
    const extraHours = document.getElementById("extraHours").value;

    if (
        !dailyHours ||
        !startWork ||
        !lunchStart ||
        !lunchEnd ||
        !returnWork
    ) {
        alert("Please fill all required fields.");
        return;
    }

    const workedBeforeLunch =
        timeToMinutes(lunchStart) - timeToMinutes(startWork);

    const requiredMinutes =
        timeToMinutes(dailyHours);

    const overtimeMinutes =
        timeToMinutes(extraHours);

    const remainingMinutes =
        requiredMinutes - workedBeforeLunch + overtimeMinutes;

    const exitTime =
        timeToMinutes(returnWork) + remainingMinutes;

    document.getElementById("result").textContent =
        minutesToTime(exitTime);

    saveData();
}

document
    .getElementById("calculateBtn")
    .addEventListener("click", calculateExitTime);

fields.forEach(id => {
    document
        .getElementById(id)
        .addEventListener("change", saveData);
});

loadData();
