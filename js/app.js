let currentCropId = null;
let editingEggRecordId = null;
let editingExpenseRecordId = null;
let editingLabourRecordId = null;
let editingSalesRecordId = null;
let editingDailyRecordId = null;

document.addEventListener("DOMContentLoaded", async () => {

    try {

        await openDatabase();

        console.log("🌱 FarmKeeper is ready.");

        setupVisitForm();
        setupCropForm();
        setupCropNavigation();
        setupCropActivityForm();
        setupFlockForm();
        setupPoultryNavigation();
        setupEggProductionForm();
        setupExpenseNavigation();
        setupExpenseForm();
        setupLabourForm();
        setupSalesForm();
        updateFinancialSummary();
        setupReportsNavigation();
        setupReportGenerator();
        loadCropList();
        setupReminderNavigation();
        setupReminderForm();
        checkDailyRecordReminder();
        setupDailyHistoryNavigation();
        updateLastVisit();

    } catch (error) {

        console.error("FarmKeeper database error:", error);

    }

});


function setupVisitForm() {

    const recordVisitButton =
        document.getElementById("recordVisitButton");

    const visitForm =
        document.getElementById("visitForm");

    const saveVisitButton =
        document.getElementById("saveVisitButton");


    recordVisitButton.addEventListener("click", () => {

        visitForm.style.display = "block";

        visitForm.scrollIntoView({
            behavior: "smooth"
        });

        setCurrentDateTime();

    });


    saveVisitButton.addEventListener("click", saveFarmVisit);
   
    setupDailyRecord();
}


function setCurrentDateTime() {

    const now = new Date();

    const date =
        now.toISOString().split("T")[0];

    const time =
        now.toTimeString().slice(0, 5);


    document.getElementById("visitDate").value = date;

    document.getElementById("visitTime").value = time;

}

async function saveFarmVisit() {

    const date =
        document.getElementById("visitDate").value;

    const time =
        document.getElementById("visitTime").value;

    const notes =
        document.getElementById("visitNotes").value.trim();


    if (!date) {

        alert("Please select the visit date.");

        return;
    }


    const visit = {

        date: date,

        time: time,

        notes: notes,

        createdAt: new Date().toISOString()

    };


    try {

        await addRecord("visits", visit);

        alert("✅ Farm visit saved successfully!");

        console.log("Farm visit saved:", visit);


        // Clear the form
        document.getElementById("visitNotes").value = "";


        // Hide the form
        document.getElementById("visitForm").style.display = "none";


        // Update dashboard
        updateLastVisit();

    } catch (error) {

        console.error("Error saving farm visit:", error);

        alert("❌ Could not save the farm visit.");

    }

}


async function updateLastVisit() {

    try {

        const visits = await getAllRecords("visits");

        if (visits.length === 0) {
            return;
        }


        // Sort visits from newest to oldest
        visits.sort((a, b) => {

            const dateA =
                new Date(`${a.date}T${a.time}`);

            const dateB =
                new Date(`${b.date}T${b.time}`);

            return dateB - dateA;

        });


        const latestVisit = visits[0];


        const lastVisitElement =
            document.querySelector(
                ".summary-card:nth-child(4) p"
            );


        lastVisitElement.textContent =
            formatVisitDate(latestVisit.date);


    } catch (error) {

        console.error(
            "Could not update last visit:",
            error
        );

    }

}


function formatVisitDate(dateString) {

    const date = new Date(dateString + "T00:00:00");

    const today = new Date();

    const todayString =
        today.toISOString().split("T")[0];


    if (dateString === todayString) {

        return "Today";

    }


    return date.toLocaleDateString(
        "en-NG",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}

function setupDailyRecord() {

    const dailyButton =
        document.getElementById("dailyRecordButton");

    const dailyForm =
        document.getElementById("dailyForm");

    const saveButton =
        document.getElementById("saveDailyButton");


    dailyButton.addEventListener("click", () => {

        dailyForm.style.display = "block";

        dailyForm.scrollIntoView({
            behavior: "smooth"
        });


        const today =
            new Date().toISOString().split("T")[0];

        document.getElementById("dailyDate").value = today;

    });


    saveButton.addEventListener(
        "click",
        saveDailyRecord
    );

}

async function saveDailyRecord() {

    const record = {

        date: document.getElementById("dailyDate").value,

        poultry: {
            birdsPresent: Number(
                document.getElementById("birdsPresent").value
            ) || 0,

            eggsCollected: Number(
                document.getElementById("eggsCollected").value
            ) || 0,

            brokenEggs: Number(
                document.getElementById("brokenEggs").value
            ) || 0,

            birdDeaths: Number(
                document.getElementById("birdDeaths").value
            ) || 0,

            feedUsed: Number(
                document.getElementById("feedUsed").value
            ) || 0
        },

        crops: {
            cropName:
                document.getElementById("cropName").value,

            activity:
                document.getElementById("cropActivity").value,

            harvestKg: Number(
                document.getElementById("harvestKg").value
            ) || 0
        },

        labour: {
            workers: Number(
                document.getElementById("workers").value
            ) || 0,

            cost: Number(
                document.getElementById("labourCost").value
            ) || 0
        },

        expenses: {
            category:
                document.getElementById("expenseCategory").value,

            amount: Number(
                document.getElementById("expenseAmount").value
            ) || 0
        },

        sales: {
            eggsSold: Number(
                document.getElementById("eggsSold").value
            ) || 0,

            vegetableSales: Number(
                document.getElementById("vegetableSales").value
            ) || 0,

            eggSales: Number(
                document.getElementById("eggSales").value
            ) || 0
        },

        notes:
            document.getElementById("dailyNotes").value.trim(),

        createdAt: new Date().toISOString()

    };


    // Make sure a date was selected
    if (!record.date) {

        alert("Please select the date.");

        return;
    }


    try {


    let id;
            console.log(
            "💾 Save clicked. Editing ID:",
            editingDailyRecordId
        );
           

    // =========================
    // UPDATE EXISTING RECORD
    // =========================

    if (editingDailyRecordId !== null) {

        record.id = editingDailyRecordId;

                console.log(
            "🔄 Record being updated:",
            record
        );

        await updateRecord(
            "dailyRecords",
            record
        );
        
        id = editingDailyRecordId;

        console.log(
            "Daily record updated:",
            record
        );

        alert(
            "✅ Daily record updated successfully!"
        );

    }


    // =========================
    // CREATE NEW RECORD
    // =========================

    else {

        id = await addRecord(
            "dailyRecords",
            record
        );

        console.log(
            "Today's farm record saved:",
            record
        );

        console.log(
            "Record ID:",
            id
        );

        alert(
            "✅ Today's farm record saved successfully!"
        );

    }


        // Clear the form
        document.getElementById("birdsPresent").value = "";
        document.getElementById("eggsCollected").value = "";
        document.getElementById("brokenEggs").value = "";
        document.getElementById("birdDeaths").value = "";
        document.getElementById("feedUsed").value = "";

        document.getElementById("cropName").value = "";
        document.getElementById("cropActivity").value = "";
        document.getElementById("harvestKg").value = "";

        document.getElementById("workers").value = "";
        document.getElementById("labourCost").value = "";

        document.getElementById("expenseCategory").value = "";
        document.getElementById("expenseAmount").value = "";

        document.getElementById("eggsSold").value = "";
        document.getElementById("vegetableSales").value = "";
        document.getElementById("eggSales").value = "";

        document.getElementById("dailyNotes").value = "";


                // Reset edit mode

        editingDailyRecordId = null;


        // Restore button text

        document.getElementById(
            "saveDailyButton"
        ).textContent =
            "💾 Save Today's Record";


        // Refresh history

        await loadDailyRecordsHistory();


        // Hide the form

        document.getElementById(
            "dailyForm"
        ).style.display = "none";

    } catch (error) {

        console.error(
            "Could not save today's farm record:",
            error
        );

        alert(
            "❌ Could not save today's farm record."
        );

    }

}
async function checkDailyRecordReminder() {

    try {

        // Get saved reminder
        const reminders =
            await getAllRecords("reminders");


        if (reminders.length === 0) {
            return;
        }


        const reminder = reminders[0];


        // Reminder is disabled
        if (!reminder.enabled || !reminder.time) {
            return;
        }


        // Get today's date
        const today =
            new Date().toISOString().split("T")[0];


        // Check whether today's record already exists
        const dailyRecords =
            await getAllRecords("dailyRecords");


        const todayRecord =
            dailyRecords.find(
                record => record.date === today
            );


        // If today's record already exists, no reminder needed
        if (todayRecord) {
            return;
        }


        // Current time
        const now = new Date();


        const currentHours =
            String(now.getHours()).padStart(2, "0");

        const currentMinutes =
            String(now.getMinutes()).padStart(2, "0");


        const currentTime =
            `${currentHours}:${currentMinutes}`;


        // Only show reminder after the selected time
        if (currentTime < reminder.time) {
            return;
        }


        // Prevent showing the same reminder repeatedly
        const reminderShownKey =
            `farmKeeperReminderShown_${today}`;


        if (
            localStorage.getItem(
                reminderShownKey
            ) === "true"
        ) {
            return;
        }


        // Mark today's reminder as shown
        localStorage.setItem(
            reminderShownKey,
            "true"
        );


        // Show reminder
        const openRecord =
            confirm(
                "🔔 FarmKeeper Reminder\n\n" +
                "You haven't recorded today's farm activities yet.\n\n" +
                "Would you like to record them now?"
            );


        if (openRecord) {

            const dailyForm =
                document.getElementById(
                    "dailyForm"
                );


            dailyForm.style.display = "block";


            dailyForm.scrollIntoView({
                behavior: "smooth"
            });

        }


    } catch (error) {

        console.error(
            "Could not check daily record reminder:",
            error
        );

    }

}

function setupCropForm() {

    const cropButton =
        document.getElementById("cropButton");

    const cropForm =
        document.getElementById("cropForm");

    const addCropButton =
        document.getElementById("addCropButton");


    cropButton.addEventListener("click", () => {

        // Show the crop area
        cropForm.style.display = "block";

        // Show crop list
        document.getElementById(
            "cropListSection"
        ).style.display = "block";

        // Hide crop details
        document.getElementById(
            "cropDetailsSection"
        ).style.display = "none";

        // Hide activity form
        document.getElementById(
            "cropActivityForm"
        ).style.display = "none";


        cropForm.scrollIntoView({
            behavior: "smooth"
        });


        // Set today's date
        const today =
            new Date().toISOString().split("T")[0];

        document.getElementById(
            "plantingDate"
        ).value = today;


        // Load existing crops
        loadCropList();

    });


    // ADD CROP BUTTON

    addCropButton.addEventListener("click", () => {

        // Show the crop form
        cropForm.style.display = "block";

        cropForm.scrollIntoView({
            behavior: "smooth"
        });


        // Set today's date
        const today =
            new Date().toISOString().split("T")[0];

        document.getElementById(
            "plantingDate"
        ).value = today;

    });


    const saveCropButton =
        document.getElementById("saveCropButton");


    saveCropButton.addEventListener(
        "click",
        saveCropRecord
    );

}

async function saveCropRecord() {

    const cropRecord = {

        cropName:
            document.getElementById("cropRecordName").value,

        variety:
            document.getElementById("cropVariety").value.trim(),

        plot:
            document.getElementById("cropPlot").value.trim(),

        plantingDate:
            document.getElementById("plantingDate").value,

        quantityPlanted:
            Number(
                document.getElementById("quantityPlanted").value
            ) || 0,

        cropUnit:
            document.getElementById("cropUnit").value,

        status:
            document.getElementById("cropStatus").value,

        notes:
            document.getElementById("cropNotes").value.trim(),

        createdAt:
            new Date().toISOString()

    };


    if (!cropRecord.cropName) {

        alert("Please select a crop.");

        return;
    }


    if (!cropRecord.plantingDate) {

        alert("Please select the planting date.");

        return;
    }


    try {

        const id = await addRecord(
            "crops",
            cropRecord
        );


        // Remember the crop we just created
        currentCropId = id;


        console.log(
            "🌱 Crop record saved:",
            cropRecord
        );

        console.log(
            "Crop ID:",
            id
        );


        alert(
            "✅ Crop record saved successfully!"
        );


        // Clear the form

        document.getElementById(
            "cropRecordName"
        ).value = "";

        document.getElementById(
            "cropVariety"
        ).value = "";

        document.getElementById(
            "cropPlot"
        ).value = "";

        document.getElementById(
            "quantityPlanted"
        ).value = "";

        document.getElementById(
            "cropNotes"
        ).value = "";


        // Hide the form

        document.getElementById(
            "cropForm"
        ).style.display = "none";


        // Refresh crop list

        await loadCropList();


    } catch (error) {

        console.error(
            "Could not save crop record:",
            error
        );

        alert(
            "❌ Could not save crop record."
        );

    }

}

async function saveCropActivity() {

    if (!currentCropId) {

        alert(
            "Please save a crop first before adding an activity."
        );

        return;
    }


    const activity = {

        cropId: currentCropId,

        date:
            document.getElementById("activityDate").value,

        type:
            document.getElementById("cropActivityType").value,

        quantity:
            Number(
                document.getElementById("activityQuantity").value
            ) || 0,

        unit:
            document.getElementById("activityUnit").value,

        notes:
            document.getElementById("activityNotes")
                .value
                .trim(),

        createdAt:
            new Date().toISOString()

    };


    if (!activity.date) {

        alert("Please select the activity date.");

        return;
    }


    if (!activity.type) {

        alert("Please select an activity.");

        return;
    }


    try {

        const id = await addRecord(
            "cropActivities",
            activity
        );


        console.log(
            "🌱 Crop activity saved:",
            activity
        );

        console.log(
            "Activity ID:",
            id
        );


        alert(
            "✅ Crop activity saved successfully!"
        );


        // Clear activity fields

        document.getElementById(
            "cropActivityType"
        ).value = "";

        document.getElementById(
            "activityQuantity"
        ).value = "";

        document.getElementById(
            "activityNotes"
        ).value = "";


    } catch (error) {

        console.error(
            "Could not save crop activity:",
            error
        );

        alert(
            "❌ Could not save crop activity."
        );

    }

}

async function loadCropList() {

    const cropList =
        document.getElementById("cropList");

    try {

        const crops =
            await getAllRecords("crops");


        cropList.innerHTML = "";


        if (crops.length === 0) {

            cropList.innerHTML = `
                <p class="empty-message">
                    No crops recorded yet.
                </p>
            `;

            return;
        }


        crops.forEach(crop => {

            const card =
                document.createElement("div");

            card.className = "crop-card";


            card.innerHTML = `

                <h3>
                    🌱 ${crop.cropName}
                </h3>

                <p>
                    <strong>Variety:</strong>
                    ${crop.variety || "Not specified"}
                </p>

                <p>
                    <strong>Plot:</strong>
                    ${crop.plot || "Not specified"}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${crop.status}
                </p>

                <button
                    type="button"
                    class="small-button"
                    data-crop-id="${crop.id}">

                    View Crop →

                </button>

            `;


            const button =
                card.querySelector("button");


            button.addEventListener(
                "click",
                () => viewCrop(crop.id)
            );


            cropList.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Could not load crop list:",
            error
        );

        cropList.innerHTML = `
            <p class="empty-message">
                Could not load crops.
            </p>
        `;

    }

}

async function viewCrop(cropId) {

    try {

        const crop =
            await getRecordById(
                "crops",
                cropId
            );


        if (!crop) {

            alert("Crop record not found.");

            return;
        }


        // Remember the selected crop

        currentCropId = cropId;


        // Hide crop list

        document.getElementById(
            "cropListSection"
        ).style.display = "none";


        // Hide crop form

        document.getElementById(
            "cropForm"
        ).style.display = "none";


        // Show crop details

        const detailsSection =
            document.getElementById(
                "cropDetailsSection"
            );

        detailsSection.style.display = "block";


        // Display crop information

        const cropDetails =
            document.getElementById(
                "cropDetails"
            );


        cropDetails.innerHTML = `

    <div class="crop-details-card">

        <h2>
            🌱 ${crop.cropName}
        </h2>

        <p>
            <strong>Variety:</strong>
            ${crop.variety || "Not specified"}
        </p>

        <p>
            <strong>Plot:</strong>
            ${crop.plot || "Not specified"}
        </p>

        <p>
            <strong>Planting Date:</strong>
            ${crop.plantingDate || "Not specified"}
        </p>

        <p>
            <strong>Quantity Planted:</strong>
            ${crop.quantityPlanted || 0}
            ${crop.cropUnit || ""}
        </p>

        <p>
            <strong>Status:</strong>
            ${crop.status || "Not specified"}
        </p>

        <p>
            <strong>Notes:</strong>
            ${crop.notes || "No notes"}
        </p>


        <div class="crop-action-buttons">

            <button
                type="button"
                class="delete-crop-button"
                id="deleteCropButton">

                🗑️ Delete Crop

            </button>

        </div>

    </div>

`;
document
    .getElementById("deleteCropButton")
    .addEventListener(
        "click",
        () => deleteCrop(cropId)
    );


        // Load activities for this crop

        await loadCropActivities(cropId);


        detailsSection.scrollIntoView({
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Could not open crop:",
            error
        );

        alert(
            "❌ Could not open crop."
        );

    }

}

async function loadCropActivities(cropId) {

    const activityList =
        document.getElementById(
            "cropActivityList"
        );


    try {

        const activities =
            await getAllRecords(
                "cropActivities"
            );


        const cropActivities =
            activities.filter(
                activity =>
                    activity.cropId === cropId
            );


        activityList.innerHTML = "";


        if (cropActivities.length === 0) {

            activityList.innerHTML = `

                <p class="empty-message">
                    No activities recorded yet.
                </p>

            `;

            return;
        }


        // Newest first

        cropActivities.sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );


        cropActivities.forEach(
            activity => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "activity-card";


                card.innerHTML = `

                    <strong>
                        ${activity.type}
                    </strong>

                    <p>
                        📅 ${activity.date}
                    </p>

                    ${
                        activity.quantity > 0
                        ? `
                            <p>
                                📦
                                ${activity.quantity}
                                ${activity.unit}
                            </p>
                          `
                        : ""
                    }

                    ${
                        activity.notes
                        ? `
                            <p>
                                📝
                                ${activity.notes}
                            </p>
                          `
                        : ""
                    }


                    <div class="activity-actions">

                        <button
                            type="button"
                            class="edit-activity-button"
                            data-id="${activity.id}">

                            ✏️ Edit

                        </button>


                        <button
                            type="button"
                            class="delete-activity-button"
                            data-id="${activity.id}">

                            🗑️ Delete

                        </button>

                    </div>

                `;


                // EDIT

                card.querySelector(
                    ".edit-activity-button"
                ).addEventListener(
                    "click",
                    () => editCropActivity(
                        activity.id
                    )
                );


                // DELETE

                card.querySelector(
                    ".delete-activity-button"
                ).addEventListener(
                    "click",
                    () => deleteCropActivity(
                        activity.id
                    )
                );


                activityList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "Could not load crop activities:",
            error
        );

        activityList.innerHTML = `

            <p class="empty-message">
                Could not load activity history.
            </p>

        `;

    }

}

async function editCropActivity(activityId) {

    try {

        const activity =
            await getRecordById(
                "cropActivities",
                activityId
            );


        if (!activity) {

            alert("Activity record not found.");

            return;
        }


        // Open the activity form

        const activityForm =
            document.getElementById(
                "cropActivityForm"
            );

        activityForm.style.display = "block";


        // Put the existing information into the form

        document.getElementById(
            "activityDate"
        ).value =
            activity.date || "";


        document.getElementById(
            "cropActivityType"
        ).value =
            activity.type || "";


        document.getElementById(
            "activityQuantity"
        ).value =
            activity.quantity || "";


        document.getElementById(
            "activityUnit"
        ).value =
            activity.unit || "none";


        document.getElementById(
            "activityNotes"
        ).value =
            activity.notes || "";


        document.getElementById(
            "activityCropName"
        ).textContent =
            "✏️ Editing crop activity";


        activityForm.scrollIntoView({
            behavior: "smooth"
        });


        // Change the save button temporarily

        const saveButton =
            document.getElementById(
                "saveActivityButton"
            );


        saveButton.textContent =
            "💾 Update Activity";


        // Remove the old click behavior

        saveButton.onclick = async () => {

            await updateCropActivity(
                activityId,
                activity
            );

        };


    } catch (error) {

        console.error(
            "Could not edit crop activity:",
            error
        );

        alert(
            "❌ Could not open activity for editing."
        );

    }

}

async function updateCropActivity(
    activityId,
    originalActivity
) {

    const updatedActivity = {

        id: activityId,

        cropId:
            originalActivity.cropId,

        date:
            document.getElementById(
                "activityDate"
            ).value,

        type:
            document.getElementById(
                "cropActivityType"
            ).value,

        quantity:
            Number(
                document.getElementById(
                    "activityQuantity"
                ).value
            ) || 0,

        unit:
            document.getElementById(
                "activityUnit"
            ).value,

        notes:
            document.getElementById(
                "activityNotes"
            ).value.trim(),

        createdAt:
            originalActivity.createdAt,

        updatedAt:
            new Date().toISOString()

    };


    if (!updatedActivity.date) {

        alert(
            "Please select the activity date."
        );

        return;
    }


    if (!updatedActivity.type) {

        alert(
            "Please select an activity."
        );

        return;
    }


    try {

        await updateRecord(
            "cropActivities",
            updatedActivity
        );


        alert(
            "✅ Activity updated successfully!"
        );


        // Restore normal button

        const saveButton =
            document.getElementById(
                "saveActivityButton"
            );

        saveButton.textContent =
            "💾 Save Activity";


        saveButton.onclick = null;


        // Clear form

        document.getElementById(
            "activityDate"
        ).value = "";

        document.getElementById(
            "cropActivityType"
        ).value = "";

        document.getElementById(
            "activityQuantity"
        ).value = "";

        document.getElementById(
            "activityUnit"
        ).value = "none";

        document.getElementById(
            "activityNotes"
        ).value = "";


        document.getElementById(
            "cropActivityForm"
        ).style.display = "none";


        // Refresh history

        await loadCropActivities(
            currentCropId
        );


    } catch (error) {

        console.error(
            "Could not update crop activity:",
            error
        );

        alert(
            "❌ Could not update activity."
        );

    }

}

async function deleteCropActivity(activityId) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this activity?"
        );


    if (!confirmDelete) {

        return;

    }


    try {

        await deleteRecord(
            "cropActivities",
            activityId
        );


        alert(
            "🗑️ Activity deleted successfully!"
        );


        await loadCropActivities(
            currentCropId
        );


    } catch (error) {

        console.error(
            "Could not delete crop activity:",
            error
        );

        alert(
            "❌ Could not delete activity."
        );

    }

}

function setupCropNavigation() {

    const backButton =
        document.getElementById(
            "backToCropListButton"
        );


    backButton.addEventListener(
        "click",
        () => {

            document.getElementById(
                "cropDetailsSection"
            ).style.display = "none";


            document.getElementById(
                "cropActivityForm"
            ).style.display = "none";


            document.getElementById(
                "cropListSection"
            ).style.display = "block";


            loadCropList();

        }
    );

}

function setupCropActivityForm() {

    const addActivityButton =
        document.getElementById("addActivityButton");

    const saveActivityButton =
        document.getElementById("saveActivityButton");

    const activityForm =
        document.getElementById("cropActivityForm");


    addActivityButton.addEventListener("click", () => {

        if (!currentCropId) {

            alert("Please select a crop first.");

            return;
        }


        // Show the activity form

        activityForm.style.display = "block";


        // Set today's date

        const today =
            new Date().toISOString().split("T")[0];

        document.getElementById(
            "activityDate"
        ).value = today;


        // Get the selected crop

        getRecordById(
            "crops",
            currentCropId
        ).then(crop => {

            if (crop) {

                document.getElementById(
                    "activityCropName"
                ).textContent =
                    `🌱 ${crop.cropName} — ${crop.plot || "No plot"}`;

            }

        });


        activityForm.scrollIntoView({
            behavior: "smooth"
        });

    });


    saveActivityButton.addEventListener(
        "click",
        async () => {

            await saveCropActivity();

            // Refresh the history after saving

            await loadCropActivities(
                currentCropId
            );

        }
    );

}

function setupFlockForm() {

    const saveFlockButton =
        document.getElementById(
            "saveFlockButton"
        );


    saveFlockButton.addEventListener(
        "click",
        saveFlock
    );


    loadFlock();

}

async function saveFlock() {

    const flock = {

        type: "poultryFlock",

        breed:
            document.getElementById(
                "flockBreed"
            ).value.trim(),

        initialBirds:
            Number(
                document.getElementById(
                    "initialBirds"
                ).value
            ) || 0,

        dateAcquired:
            document.getElementById(
                "dateAcquired"
            ).value,

        notes:
            document.getElementById(
                "flockNotes"
            ).value.trim(),

        createdAt:
            new Date().toISOString()

    };


    if (!flock.breed) {

        alert("Please enter the bird breed.");

        return;
    }


    if (flock.initialBirds <= 0) {

        alert(
            "Please enter the number of birds."
        );

        return;
    }


    if (!flock.dateAcquired) {

        alert(
            "Please select the acquisition date."
        );

        return;
    }


    try {

        // Check whether a flock already exists

        const existing =
            await getAllRecords("farm");


        const poultryRecords =
            existing.filter(
                record =>
                    record.type === "poultryFlock"
            );


        if (poultryRecords.length > 0) {

            const oldFlock =
                poultryRecords[0];


            flock.id = oldFlock.id;

        }


        await updateRecord(
            "farm",
            flock
        );


        alert(
            "✅ Flock information saved!"
        );


        await loadFlock();


    } catch (error) {

        console.error(
            "Could not save flock:",
            error
        );

        alert(
            "❌ Could not save flock information."
        );

    }

}

async function loadFlock() {

    try {

        const records =
            await getAllRecords("farm");


        const flock =
            records.find(
                record =>
                    record.type === "poultryFlock"
            );


        const summary =
            document.getElementById(
                "flockSummary"
            );


        if (!flock) {

            summary.style.display = "none";

            return;
        }


        summary.style.display = "block";


        summary.innerHTML = `

            <h3>🐔 Current Flock</h3>

            <p>
                <strong>Breed:</strong>
                ${flock.breed}
            </p>

            <p>
                <strong>Initial Birds:</strong>
                ${flock.initialBirds}
            </p>

            <p>
                <strong>Date Acquired:</strong>
                ${flock.dateAcquired}
            </p>

            ${
                flock.notes
                ? `
                    <p>
                        <strong>Notes:</strong>
                        ${flock.notes}
                    </p>
                  `
                : ""
            }

        `;


        // Also put the information back into the form

        document.getElementById(
            "flockBreed"
        ).value = flock.breed || "";

        document.getElementById(
            "initialBirds"
        ).value = flock.initialBirds || "";

        document.getElementById(
            "dateAcquired"
        ).value = flock.dateAcquired || "";

        document.getElementById(
            "flockNotes"
        ).value = flock.notes || "";


    } catch (error) {

        console.error(
            "Could not load flock:",
            error
        );

    }

}

function setupPoultryNavigation() {

    const eggProductionButton =
        document.getElementById("eggProductionButton");

    const poultrySection =
        document.getElementById("poultrySection");

    const backButton =
        document.getElementById("backFromPoultryButton");


    // Open Poultry

    eggProductionButton.addEventListener("click", () => {

        poultrySection.style.display = "block";

        poultrySection.scrollIntoView({
            behavior: "smooth"
        });

    });


    // Go back to dashboard

    backButton.addEventListener("click", () => {

        poultrySection.style.display = "none";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });

}

async function saveFlockSetup() {

    const breed =
        document.getElementById("flockBreed").value.trim();

    const birds =
        Number(
            document.getElementById("initialBirds").value
        );

    const dateAcquired =
        document.getElementById("dateAcquired").value;

    const notes =
        document.getElementById("flockNotes").value.trim();


    // Validation

    if (!breed) {
        alert("Please enter the bird breed.");
        return;
    }

    if (!birds || birds <= 0) {
        alert("Please enter the number of birds.");
        return;
    }

    if (!dateAcquired) {
        alert("Please select the date acquired.");
        return;
    }


    const flock = {

        breed: breed,

        initialBirds: birds,

        dateAcquired: dateAcquired,

        notes: notes,

        createdAt: new Date().toISOString()

    };


    try {

        // Check if a flock already exists
        const existingFlocks =
            await getAllRecords("flock");


        // If one already exists, don't create another
        if (existingFlocks.length > 0) {

            const existingFlock =
                existingFlocks[0];

            flock.id = existingFlock.id;

            await updateRecord(
                "flock",
                flock
            );

        } else {

            await addRecord(
                "flock",
                flock
            );

        }


        console.log(
            "🐔 Flock saved successfully:",
            flock
        );


        alert(
            "✅ Flock information saved successfully!"
        );



        // Show saved flock information
        displayFlockSummary(flock);

        document.getElementById(
            "flockSetupArea"
        ).style.display = "none";

        // Clear the form
        document.getElementById("flockBreed").value = "";
        document.getElementById("initialBirds").value = "";
        document.getElementById("dateAcquired").value = "";
        document.getElementById("flockNotes").value = "";


    } catch (error) {

        console.error(
            "Could not save flock:",
            error
        );

        alert(
            "❌ Could not save flock information."
        );

    }

}

function displayFlockSummary(flock) {

    const summary =
        document.getElementById("flockSummary");

    summary.innerHTML = `

        <h3>🐔 Current Flock</h3>

        <p>
            <strong>Breed:</strong>
            ${flock.breed}
        </p>

        <p>
            <strong>Birds:</strong>
            ${flock.initialBirds}
        </p>

        <p>
            <strong>Date Acquired:</strong>
            ${flock.dateAcquired}
        </p>

        <p>
            <strong>Notes:</strong>
            ${flock.notes || "No notes"}
        </p>

    `;

    summary.style.display = "block";
}

function setupFlockForm() {

    const saveFlockButton =
        document.getElementById("saveFlockButton");


    saveFlockButton.addEventListener(
        "click",
        saveFlockSetup
    );


    loadFlockSetup();

    const manageFlockButton =
    document.getElementById("manageFlockButton");

    const flockSetupArea =
    document.getElementById("flockSetupArea");


    manageFlockButton.addEventListener("click", () => {

        flockSetupArea.style.display = "block";

        flockSetupArea.scrollIntoView({
        behavior: "smooth"
    });

});

}

async function loadFlockSetup() {

    try {

        const flocks =
            await getAllRecords("flock");

        if (flocks.length === 0) {
            return;
        }

        const flock = flocks[0];

        displayFlockSummary(flock);

        console.log(
            "🐔 Flock information loaded:",
            flock
        );

    } catch (error) {

        console.error(
            "Could not load flock:",
            error
        );

    }

}

function setupEggProductionForm() {

    const saveButton =
        document.getElementById(
            "saveEggRecordButton"
        );


    const today =
        new Date().toISOString().split("T")[0];


    document.getElementById(
        "eggRecordDate"
    ).value = today;


    saveButton.addEventListener(
        "click",
        () => {

            if (editingEggRecordId !== null) {

                updateEggProductionRecord(
                    editingEggRecordId
                );

            } else {

                saveEggProductionRecord();

            }

        }
    );


    loadEggProductionHistory();

}

async function saveEggProductionRecord() {

    const record = {

        date:
            document.getElementById(
                "eggRecordDate"
            ).value,

        birdsPresent:
            Number(
                document.getElementById(
                    "eggBirdsPresent"
                ).value
            ) || 0,

        eggsCollected:
            Number(
                document.getElementById(
                    "dailyEggsCollected"
                ).value
            ) || 0,

        brokenEggs:
            Number(
                document.getElementById(
                    "dailyBrokenEggs"
                ).value
            ) || 0,

        birdDeaths:
            Number(
                document.getElementById(
                    "dailyBirdDeaths"
                ).value
            ) || 0,

        feedUsed:
            Number(
                document.getElementById(
                    "dailyFeedUsed"
                ).value
            ) || 0,

        notes:
            document.getElementById(
                "eggRecordNotes"
            ).value.trim(),

        createdAt:
            new Date().toISOString()

    };


    if (!record.date) {

        alert("Please select the date.");

        return;
    }


    if (record.birdsPresent <= 0) {

        alert(
            "Please enter the number of birds present."
        );

        return;
    }


    try {

        const id =
            await addRecord(
                "eggRecords",
                record
            );


        console.log(
            "🥚 Egg production record saved:",
            record
        );

        console.log(
            "Record ID:",
            id
        );


        alert(
            "✅ Egg production record saved!"
        );

        await loadEggProductionHistory();

        // Clear the form

        document.getElementById(
            "eggBirdsPresent"
        ).value = "";

        document.getElementById(
            "dailyEggsCollected"
        ).value = "";

        document.getElementById(
            "dailyBrokenEggs"
        ).value = "";

        document.getElementById(
            "dailyBirdDeaths"
        ).value = "";

        document.getElementById(
            "dailyFeedUsed"
        ).value = "";

        document.getElementById(
            "eggRecordNotes"
        ).value = "";


    } catch (error) {

        console.error(
            "Could not save egg production:",
            error
        );

        alert(
            "❌ Could not save egg production record."
        );

    }

}

async function loadEggProductionHistory() {

    const historyContainer =
        document.getElementById(
            "eggProductionHistory"
        );


    try {

        const records =
            await getAllRecords("eggRecords");


        historyContainer.innerHTML = "";


        if (records.length === 0) {

            historyContainer.innerHTML = `

                <p class="empty-message">
                    No egg production records yet.
                </p>

            `;

            return;
        }


        // Newest records first

        records.sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );


        records.forEach(record => {

            const usableEggs =
                Math.max(
                    0,
                    record.eggsCollected -
                    record.brokenEggs
                );


            const card =
                document.createElement("div");

            card.className =
                "egg-record-card";


            card.innerHTML = `

                <h4>
                    🥚 ${record.date}
                </h4>

                <p>
                    🐔
                    <strong>Birds:</strong>
                    ${record.birdsPresent}
                </p>

                <p>
                    🥚
                    <strong>Eggs Collected:</strong>
                    ${record.eggsCollected}
                </p>

                <p>
                    💔
                    <strong>Broken Eggs:</strong>
                    ${record.brokenEggs}
                </p>

                <p>
                    ✅
                    <strong>Usable Eggs:</strong>
                    ${usableEggs}
                </p>

                <p>
                    💀
                    <strong>Bird Deaths:</strong>
                    ${record.birdDeaths}
                </p>

                <p>
                    🌾
                    <strong>Feed Used:</strong>
                    ${record.feedUsed} kg
                </p>

                ${
                    record.notes
                    ? `
                        <p>
                            📝
                            <strong>Notes:</strong>
                            ${record.notes}
                        </p>
                    `
                    : ""
                }


                <div class="egg-record-actions">

                    <button
                        type="button"
                        class="edit-egg-button">

                        ✏️ Edit

                    </button>


                    <button
                        type="button"
                        class="delete-egg-button">

                        🗑️ Delete

                    </button>

                </div>

            `;


            // Edit button

            card.querySelector(
                ".edit-egg-button"
            ).addEventListener(
                "click",
                () => editEggRecord(record.id)
            );


            // Delete button

            card.querySelector(
                ".delete-egg-button"
            ).addEventListener(
                "click",
                () => deleteEggRecord(record.id)
            );


            historyContainer.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Could not load egg production history:",
            error
        );


        historyContainer.innerHTML = `

            <p class="empty-message">
                Could not load egg production history.
            </p>

        `;

    }

}

async function editEggRecord(recordId) {

    try {

        const record =
            await getRecordById(
                "eggRecords",
                recordId
            );


        if (!record) {

            alert(
                "Egg production record not found."
            );

            return;
        }


        // Remember which record we are editing

        editingEggRecordId = recordId;


        // Load record into the form

        document.getElementById(
            "eggRecordDate"
        ).value =
            record.date || "";


        document.getElementById(
            "eggBirdsPresent"
        ).value =
            record.birdsPresent || "";


        document.getElementById(
            "dailyEggsCollected"
        ).value =
            record.eggsCollected || "";


        document.getElementById(
            "dailyBrokenEggs"
        ).value =
            record.brokenEggs || "";


        document.getElementById(
            "dailyBirdDeaths"
        ).value =
            record.birdDeaths || "";


        document.getElementById(
            "dailyFeedUsed"
        ).value =
            record.feedUsed || "";


        document.getElementById(
            "eggRecordNotes"
        ).value =
            record.notes || "";


        // Change button text

        document.getElementById(
            "saveEggRecordButton"
        ).textContent =
            "💾 Update Egg Record";


        // Scroll to form

        document.querySelector(
            ".egg-production-card"
        ).scrollIntoView({
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Could not edit egg record:",
            error
        );

        alert(
            "❌ Could not open egg record for editing."
        );

    }

}
async function updateEggProductionRecord(recordId) {

    const date =
        document.getElementById(
            "eggRecordDate"
        ).value;

    const birdsPresent =
        Number(
            document.getElementById(
                "eggBirdsPresent"
            ).value
        ) || 0;

    const eggsCollected =
        Number(
            document.getElementById(
                "dailyEggsCollected"
            ).value
        ) || 0;

    const brokenEggs =
        Number(
            document.getElementById(
                "dailyBrokenEggs"
            ).value
        ) || 0;

    const birdDeaths =
        Number(
            document.getElementById(
                "dailyBirdDeaths"
            ).value
        ) || 0;

    const feedUsed =
        Number(
            document.getElementById(
                "dailyFeedUsed"
            ).value
        ) || 0;

    const notes =
        document.getElementById(
            "eggRecordNotes"
        ).value.trim();


    if (!date) {

        alert("Please select the date.");

        return;
    }


    if (birdsPresent <= 0) {

        alert(
            "Please enter the number of birds present."
        );

        return;
    }


    try {

        const oldRecord =
            await getRecordById(
                "eggRecords",
                recordId
            );


        if (!oldRecord) {

            alert(
                "Record could not be found."
            );

            return;
        }


        const updatedRecord = {

            id: recordId,

            date: date,

            birdsPresent: birdsPresent,

            eggsCollected: eggsCollected,

            brokenEggs: brokenEggs,

            birdDeaths: birdDeaths,

            feedUsed: feedUsed,

            notes: notes,

            createdAt:
                oldRecord.createdAt,

            updatedAt:
                new Date().toISOString()

        };


        await updateRecord(
            "eggRecords",
            updatedRecord
        );


        alert(
            "✅ Egg production record updated!"
        );


        // Exit edit mode

        editingEggRecordId = null;


        // Restore button

        document.getElementById(
            "saveEggRecordButton"
        ).textContent =
            "💾 Save Egg Record";


        // Clear form

        document.getElementById(
            "eggBirdsPresent"
        ).value = "";

        document.getElementById(
            "dailyEggsCollected"
        ).value = "";

        document.getElementById(
            "dailyBrokenEggs"
        ).value = "";

        document.getElementById(
            "dailyBirdDeaths"
        ).value = "";

        document.getElementById(
            "dailyFeedUsed"
        ).value = "";

        document.getElementById(
            "eggRecordNotes"
        ).value = "";


        // Set date back to today

        document.getElementById(
            "eggRecordDate"
        ).value =
            new Date()
                .toISOString()
                .split("T")[0];


        // Refresh history

        await loadEggProductionHistory();


    } catch (error) {

        console.error(
            "Could not update egg record:",
            error
        );

        alert(
            "❌ Could not update egg production record."
        );

    }

}
async function deleteEggRecord(recordId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this egg production record?"
        );


    if (!confirmed) {

        return;

    }


    try {

        await deleteRecord(
            "eggRecords",
            recordId
        );


        alert(
            "🗑️ Egg production record deleted."
        );


        await loadEggProductionHistory();


    } catch (error) {

        console.error(
            "Could not delete egg record:",
            error
        );

        alert(
            "❌ Could not delete egg production record."
        );

    }

}

function setupExpenseNavigation() {

    const expenseButton =
        document.getElementById("expenseButton");

    const expenseSection =
        document.getElementById("farmExpenseSection");

    const backButton =
        document.getElementById("farmExpenseButton");


    expenseButton.addEventListener("click", () => {

        expenseSection.style.display = "block";

        expenseSection.scrollIntoView({
            behavior: "smooth"
        });

    });


    backButton.addEventListener("click", () => {

        expenseSection.style.display = "none";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });

}
function setupReminderNavigation() {

    const reminderButton =
        document.getElementById("remindersButton");

    const reminderSection =
        document.getElementById("remindersSection");

    const backButton =
        document.getElementById("remindersBackButton");


    reminderButton.addEventListener("click", () => {

        reminderSection.style.display = "block";

        reminderSection.scrollIntoView({
            behavior: "smooth"
        });

    });


    backButton.addEventListener("click", () => {

        reminderSection.style.display = "none";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });

}
async function saveReminder() {

    const time =
        document.getElementById(
            "dailyReminderTime"
        ).value;

    const enabled =
        document.getElementById(
            "dailyReminderEnabled"
        ).checked;


    if (enabled && !time) {

        alert(
            "Please select a reminder time."
        );

        return;
    }


    try {

        const reminders =
            await getAllRecords(
                "reminders"
            );


        // Remove previous reminder

        for (const reminder of reminders) {

            await deleteRecord(
                "reminders",
                reminder.id
            );

        }


        // Save the new reminder

        await addRecord(
            "reminders",
            {
                type: "dailyRecord",
                time: time,
                enabled: enabled,
                createdAt:
                    new Date().toISOString()
            }
        );


        alert(
            "✅ Reminder saved successfully!"
        );


        await updateReminderStatus();


    } catch (error) {

        console.error(
            "Could not save reminder:",
            error
        );


        alert(
            "❌ Could not save reminder."
        );

    }

}
function setupReminderForm() {

    const saveButton =
        document.getElementById(
            "saveReminderButton"
        );


    if (!saveButton) {
        console.error(
            "Save Reminder button not found."
        );
        return;
    }


    saveButton.addEventListener(
        "click",
        saveReminder
    );


    updateReminderStatus();

}

async function updateReminderStatus() {

    const status =
        document.getElementById(
            "reminderStatus"
        );

    try {

        const reminders =
            await getAllRecords(
                "reminders"
            );


        if (reminders.length === 0) {

            status.innerHTML = `
                <h3>🔔 Reminder Status</h3>

                <p>
                    Daily reminder is currently disabled.
                </p>
            `;

            return;
        }


        const reminder =
            reminders[0];


        if (!reminder.enabled) {

            status.innerHTML = `
                <h3>🔔 Reminder Status</h3>

                <p>
                    🔕 Daily reminder is disabled.
                </p>
            `;

            return;
        }


        // Convert 24-hour time to a friendly format

        const [hours, minutes] =
            reminder.time.split(":");

        const date =
            new Date();

        date.setHours(
            Number(hours),
            Number(minutes)
        );


        const formattedTime =
            date.toLocaleTimeString(
                "en-NG",
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            );


        status.innerHTML = `
            <h3>🔔 Reminder Status</h3>

            <p>
                🟢 Daily reminder is enabled for
                <strong>${formattedTime}</strong>.
            </p>
        `;


    } catch (error) {

        console.error(
            "Could not load reminder status:",
            error
        );


        status.innerHTML = `
            <h3>🔔 Reminder Status</h3>

            <p>
                ⚠️ Could not load reminder status.
            </p>
        `;

    }

}

async function saveExpenseRecord() {

    const record = {

        date:
            document.getElementById(
                "farmExpenseDate"
            ).value,

        category:
            document.getElementById(
                "farmExpenseCategory"
            ).value,

        description:
            document.getElementById(
                "farmExpenseDescription"
            ).value.trim(),

        amount:
            Number(
                document.getElementById(
                    "farmExpenseAmount"
                ).value
            ) || 0,

        notes:
            document.getElementById(
                "farmExpenseNotes"
            ).value.trim(),

        createdAt:
            new Date().toISOString()

    };


    if (!record.date) {

        alert(
            "Please select the expense date."
        );

        return;
    }


    if (!record.category) {

        alert(
            "Please select an expense category."
        );

        return;
    }


    if (record.amount <= 0) {

        alert(
            "Please enter a valid amount."
        );

        return;
    }


    try {

        const id =
            await addRecord(
                "expenses",
                record
            );


        console.log(
            "💰 Expense saved:",
            record
        );

        console.log(
            "Expense ID:",
            id
        );


        alert(
            "✅ Expense saved successfully!"
        );


        clearExpenseForm();


        await loadExpenseHistory();
        await updateFinancialSummary();


    } catch (error) {

        console.error(
            "Could not save expense:",
            error
        );

        alert(
            "❌ Could not save expense."
        );

    }

}
function clearExpenseForm() {

    document.getElementById(
        "farmExpenseCategory"
    ).value = "";

    document.getElementById(
        "farmExpenseDescription"
    ).value = "";

    document.getElementById(
        "farmExpenseAmount"
    ).value = "";

    document.getElementById(
        "farmExpenseNotes"
    ).value = "";

}
async function updateExpenseRecord(recordId) {

    const date =
        document.getElementById(
            "farmExpenseDate"
        ).value;

    const category =
        document.getElementById(
            "farmExpenseCategory"
        ).value;

    const description =
        document.getElementById(
            "farmExpenseDescription"
        ).value.trim();

    const amount =
        Number(
            document.getElementById(
                "farmExpenseAmount"
            ).value
        ) || 0;

    const notes =
        document.getElementById(
            "farmExpenseNotes"
        ).value.trim();


    if (!date) {

        alert(
            "Please select the expense date."
        );

        return;
    }


    if (!category) {

        alert(
            "Please select an expense category."
        );

        return;
    }


    if (amount <= 0) {

        alert(
            "Please enter a valid amount."
        );

        return;
    }


    try {

        const oldRecord =
            await getRecordById(
                "expenses",
                recordId
            );


        if (!oldRecord) {

            alert(
                "Expense record not found."
            );

            return;
        }


        const updatedRecord = {

            id: recordId,

            date: date,

            category: category,

            description: description,

            amount: amount,

            notes: notes,

            createdAt:
                oldRecord.createdAt,

            updatedAt:
                new Date().toISOString()

        };


        await updateRecord(
            "expenses",
            updatedRecord
        );


        alert(
            "✅ Expense updated successfully!"
        );


        // Leave edit mode

        editingExpenseRecordId = null;


        // Restore button

        document.getElementById(
            "saveExpenseButton"
        ).textContent =
            "💾 Save Expense";


        clearExpenseForm();


        await loadExpenseHistory();
        await updateFinancialSummary();


    } catch (error) {

        console.error(
            "Could not update expense:",
            error
        );

        alert(
            "❌ Could not update expense."
        );

    }

}

function setupReportsNavigation() {

    const reportsButton =
        document.getElementById("reportsButton");

    const reportsSection =
        document.getElementById("reportsSection");

    const backButton =
        document.getElementById("reportsBackButton");


    reportsButton.addEventListener(
        "click",
        () => {

            reportsSection.style.display = "block";

            reportsSection.scrollIntoView({
                behavior: "smooth"
            });

        }
    );


    backButton.addEventListener(
        "click",
        () => {

            reportsSection.style.display = "none";

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );

}

function setupReportGenerator() {

    const generateButton =
        document.getElementById(
            "generateReportButton"
        );


    generateButton.addEventListener(
        "click",
        generateFarmReport
    );

}

async function generateFarmReport() {

    const period =
        document.getElementById(
            "reportPeriod"
        ).value;


    const reportResults =
        document.getElementById(
            "reportResults"
        );


    try {

        // Get all farm records

        const sales =
            await getAllRecords("sales");

        const expenses =
            await getAllRecords("expenses");

        const labour =
            await getAllRecords("labour");

        const eggRecords =
            await getAllRecords("eggRecords");

        const cropActivities =
            await getAllRecords("cropActivities");

        const dailyRecords =
            await getAllRecords("dailyRecords");


        // Determine date range

        const now = new Date();

        let startDate = null;


        if (period === "today") {

            startDate = new Date();

            startDate.setHours(
                0, 0, 0, 0
            );

        }


        else if (period === "week") {

            startDate = new Date();

            startDate.setDate(
                now.getDate() -
                now.getDay()
            );

            startDate.setHours(
                0, 0, 0, 0
            );

        }


        else if (period === "month") {

            startDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );

        }


        // Filter records

        function isInPeriod(record) {

            if (!startDate) {
                return true;
            }


            if (!record.date) {
                return false;
            }


            const recordDate =
                new Date(
                    record.date + "T00:00:00"
                );


            return recordDate >= startDate &&
                   recordDate <= now;

        }


        const filteredSales =
            sales.filter(isInPeriod);


        const filteredExpenses =
            expenses.filter(isInPeriod);


        const filteredLabour =
            labour.filter(isInPeriod);


        const filteredEggs =
            eggRecords.filter(isInPeriod);


        const filteredActivities =
            cropActivities.filter(isInPeriod);


        const filteredDailyRecords =
            dailyRecords.filter(isInPeriod);


        // =========================
        // FINANCIAL CALCULATIONS
        // =========================

        const totalIncome =
            filteredSales.reduce(
                (total, sale) =>
                    total +
                    Number(sale.amount || 0),
                0
            );


        const totalExpenses =
            filteredExpenses.reduce(
                (total, expense) =>
                    total +
                    Number(expense.amount || 0),
                0
            );


        const totalLabour =
            filteredLabour.reduce(
                (total, record) =>
                    total +
                    Number(record.cost || 0),
                0
            );


        const totalCosts =
            totalExpenses +
            totalLabour;


        const netProfit =
            totalIncome -
            totalCosts;


        // =========================
        // EGG CALCULATIONS
        // =========================

        let eggsCollected = 0;

        let brokenEggs = 0;

        let birdDeaths = 0;


        filteredEggs.forEach(record => {

            eggsCollected +=
                Number(
                    record.eggsCollected || 0
                );

            brokenEggs +=
                Number(
                    record.brokenEggs || 0
                );

            birdDeaths +=
                Number(
                    record.birdDeaths || 0
                );

        });


        // =========================
        // REPORT TITLE
        // =========================

        let periodName = "All Time";


        if (period === "today") {
            periodName = "Today";
        }

        else if (period === "week") {
            periodName = "This Week";
        }

        else if (period === "month") {
            periodName = "This Month";
        }


        // =========================
        // DISPLAY REPORT
        // =========================

        reportResults.innerHTML = `

            <div class="report-card">

                <h3>
                    📊 Farm Report
                </h3>

                <p>
                    <strong>Period:</strong>
                    ${periodName}
                </p>

            </div>


            <div class="report-card">

                <h3>
                    🐔 Poultry
                </h3>

                <div class="report-item">

                    <span>
                        Eggs Collected
                    </span>

                    <strong>
                        ${eggsCollected}
                    </strong>

                </div>


                <div class="report-item">

                    <span>
                        Broken Eggs
                    </span>

                    <strong>
                        ${brokenEggs}
                    </strong>

                </div>


                <div class="report-item">

                    <span>
                        Bird Deaths
                    </span>

                    <strong>
                        ${birdDeaths}
                    </strong>

                </div>

            </div>


            <div class="report-card">

                <h3>
                    🌱 Crop Activities
                </h3>

                <div class="report-item">

                    <span>
                        Activities Recorded
                    </span>

                    <strong>
                        ${filteredActivities.length}
                    </strong>

                </div>

            </div>


            <div class="report-card">

                <h3>
                    💰 Financial Summary
                </h3>


                <div class="report-item">

                    <span>
                        Total Income
                    </span>

                    <strong>
                        ₦${totalIncome.toLocaleString(
                            "en-NG"
                        )}
                    </strong>

                </div>


                <div class="report-item">

                    <span>
                        Expenses
                    </span>

                    <strong>
                        ₦${totalExpenses.toLocaleString(
                            "en-NG"
                        )}
                    </strong>

                </div>


                <div class="report-item">

                    <span>
                        Labour
                    </span>

                    <strong>
                        ₦${totalLabour.toLocaleString(
                            "en-NG"
                        )}
                    </strong>

                </div>


                <div class="report-item">

                    <span>
                        Total Costs
                    </span>

                    <strong>
                        ₦${totalCosts.toLocaleString(
                            "en-NG"
                        )}
                    </strong>

                </div>


                <div class="report-item report-total">

                    <span>
                        📈 Net Profit
                    </span>

                    <strong>
                        ₦${netProfit.toLocaleString(
                            "en-NG"
                        )}
                    </strong>

                </div>

            </div>


            <div class="report-card">

                <h3>
                    📝 Daily Records
                </h3>

                <div class="report-item">

                    <span>
                        Records Submitted
                    </span>

                    <strong>
                        ${filteredDailyRecords.length}
                    </strong>

                </div>

            </div>

        `;


        console.log(
            "📊 Farm report generated:",
            {
                period: periodName,
                income: totalIncome,
                expenses: totalExpenses,
                labour: totalLabour,
                profit: netProfit,
                eggsCollected,
                brokenEggs,
                birdDeaths
            }
        );


    } catch (error) {

        console.error(
            "Could not generate farm report:",
            error
        );


        reportResults.innerHTML = `

            <p class="empty-message">

                ❌ Could not generate farm report.

            </p>

        `;

    }

}

function setupExpenseForm() {

    const saveButton =
        document.getElementById(
            "saveExpenseButton"
        );


    const today =
        new Date().toISOString().split("T")[0];


    document.getElementById(
        "farmExpenseDate"
    ).value = today;


    saveButton.addEventListener(
    "click",
    () => {

        if (editingExpenseRecordId !== null) {

            updateExpenseRecord(
                editingExpenseRecordId
            );

        } else {

            saveExpenseRecord();

        }

    }
);


    loadExpenseHistory();

}

async function loadExpenseHistory() {

    const history =
        document.getElementById(
            "expenseHistory"
        );


    try {

        const expenses =
            await getAllRecords("expenses");


        history.innerHTML = "";


        if (expenses.length === 0) {

            history.innerHTML = `

                <p class="empty-message">
                    No expenses recorded yet.
                </p>

            `;

            return;
        }


        expenses.sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );


        expenses.forEach(expense => {

            const card =
                document.createElement("div");


            card.className =
                "expense-record-card";


            card.innerHTML = `

                <h4>
                    💰 ${expense.date}
                </h4>

                <p>
                    <strong>Category:</strong>
                    ${expense.category}
                </p>

                ${
                    expense.description
                    ? `
                        <p>
                            <strong>Description:</strong>
                            ${expense.description}
                        </p>
                    `
                    : ""
                }

                <p>
                    <strong>Amount:</strong>
                    ₦${Number(
                        expense.amount
                    ).toLocaleString("en-NG")}
                </p>

                ${
                    expense.notes
                    ? `
                        <p>
                            <strong>Notes:</strong>
                            ${expense.notes}
                        </p>
                    `
                    : ""
                }


                <div class="expense-record-actions">

                    <button
                        type="button"
                        class="edit-expense-button">

                        ✏️ Edit

                    </button>


                    <button
                        type="button"
                        class="delete-expense-button">

                        🗑️ Delete

                    </button>

                </div>

            `;


            // Edit button

            card.querySelector(
                ".edit-expense-button"
            ).addEventListener(
                "click",
                () => editExpenseRecord(expense.id)
            );


            // Delete button

            card.querySelector(
                ".delete-expense-button"
            ).addEventListener(
                "click",
                () => deleteExpenseRecord(expense.id)
            );


            history.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Could not load expense history:",
            error
        );


        history.innerHTML = `

            <p class="empty-message">
                Could not load expense history.
            </p>

        `;

    }

}



async function editExpenseRecord(recordId) {

    try {

        const expense =
            await getRecordById(
                "expenses",
                recordId
            );


        if (!expense) {

            alert(
                "Expense record not found."
            );

            return;
        }


        // Put the existing values into the form

        document.getElementById(
            "farmExpenseDate"
        ).value =
            expense.date || "";


        document.getElementById(
            "farmExpenseCategory"
        ).value =
            expense.category || "";


        document.getElementById(
            "farmExpenseDescription"
        ).value =
            expense.description || "";


        document.getElementById(
            "farmExpenseAmount"
        ).value =
            expense.amount || "";


        document.getElementById(
            "farmExpenseNotes"
        ).value =
            expense.notes || "";


        // Store the ID we're editing

        editingExpenseRecordId =
            recordId;


        // Change button text

        document.getElementById(
            "saveExpenseButton"
        ).textContent =
            "💾 Update Expense";


        // Scroll back to the form

        document.getElementById(
            "farmExpenseSection"
        ).scrollIntoView({
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Could not edit expense:",
            error
        );

        alert(
            "❌ Could not open expense for editing."
        );

    }

}

async function deleteExpenseRecord(recordId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this expense?"
        );


    if (!confirmed) {

        return;

    }


    try {

        await deleteRecord(
            "expenses",
            recordId
        );


        alert(
            "🗑️ Expense deleted successfully."
        );


        await loadExpenseHistory();
        await updateFinancialSummary();


    } catch (error) {

        console.error(
            "Could not delete expense:",
            error
        );

        alert(
            "❌ Could not delete expense."
        );

    }

}

function setupLabourForm() {

    const labourButton =
        document.getElementById(
            "labourButton"
        );

    const labourSection =
        document.getElementById(
            "farmLabourSection"
        );

    const backButton =
        document.getElementById(
            "farmLabourBackButton"
        );

    const saveButton =
        document.getElementById(
            "saveLabourButton"
        );


    // Open Labour

    labourButton.addEventListener(
        "click",
        () => {

            labourSection.style.display =
                "block";

            labourSection.scrollIntoView({
                behavior: "smooth"
            });

            setLabourDate();

            loadLabourHistory();
            

        }
    );


    // Back to Dashboard

    backButton.addEventListener(
        "click",
        () => {

            labourSection.style.display =
                "none";

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );


    // Save Labour

    saveButton.addEventListener(
        "click",
        saveLabourRecord
    );

}

function setLabourDate() {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    document.getElementById(
        "farmLabourDate"
    ).value = today;

}

async function saveLabourRecord() {

    const record = {

        date:
            document.getElementById(
                "farmLabourDate"
            ).value,

        workers:
            Number(
                document.getElementById(
                    "farmLabourWorkers"
                ).value
            ) || 0,

        type:
            document.getElementById(
                "farmLabourType"
            ).value,

        cost:
            Number(
                document.getElementById(
                    "farmLabourCost"
                ).value
            ) || 0,

        notes:
            document.getElementById(
                "farmLabourNotes"
            ).value.trim(),

        createdAt:
            new Date().toISOString()

    };


    if (!record.date) {

        alert(
            "Please select the labour date."
        );

        return;
    }


    if (record.workers <= 0) {

        alert(
            "Please enter the number of workers."
        );

        return;
    }


    if (!record.type) {

        alert(
            "Please select the type of work."
        );

        return;
    }


    if (record.cost <= 0) {

        alert(
            "Please enter a valid labour cost."
        );

        return;
    }


    try {

        // EDIT MODE

        if (editingLabourRecordId !== null) {

            const oldRecord =
                await getRecordById(
                    "labour",
                    editingLabourRecordId
                );


            if (!oldRecord) {

                alert(
                    "Labour record not found."
                );

                return;
            }


            record.id =
                editingLabourRecordId;

            record.createdAt =
                oldRecord.createdAt;

            record.updatedAt =
                new Date().toISOString();


            await updateRecord(
                "labour",
                record
            );


            console.log(
                "👷 Labour record updated:",
                record
            );


            alert(
                "✅ Labour record updated successfully!"
            );


            editingLabourRecordId = null;


            document.getElementById(
                "saveLabourButton"
            ).textContent =
                "💾 Save Labour Record";


        }

        // NEW RECORD MODE

        else {

            const id =
                await addRecord(
                    "labour",
                    record
                );


            console.log(
                "👷 Labour record saved:",
                record
            );

            console.log(
                "Labour ID:",
                id
            );


            alert(
                "✅ Labour record saved successfully!"
            );

        }


        clearLabourForm();


        await loadLabourHistory();
        await updateFinancialSummary();


    } catch (error) {

        console.error(
            "Could not save/update labour record:",
            error
        );

        alert(
            "❌ Could not save labour record."
        );

    }

}

function clearLabourForm() {

    document.getElementById(
        "farmLabourWorkers"
    ).value = "";

    document.getElementById(
        "farmLabourType"
    ).value = "";

    document.getElementById(
        "farmLabourCost"
    ).value = "";

    document.getElementById(
        "farmLabourNotes"
    ).value = "";

}

async function loadLabourHistory() {

    const history =
        document.getElementById(
            "farmLabourHistory"
        );


    try {

        const records =
            await getAllRecords(
                "labour"
            );


        history.innerHTML = "";


        if (records.length === 0) {

            history.innerHTML = `

                <p class="empty-message">
                    No labour records yet.
                </p>

            `;

            return;
        }


        records.sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );


        records.forEach(record => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "labour-record-card";


            card.innerHTML = `

                <h4>
                    👷 Labour — ${record.date}
                </h4>

                <p>
                    <strong>Workers:</strong>
                    ${record.workers}
                </p>

                <p>
                    <strong>Work:</strong>
                    ${record.type}
                </p>

                <p>
                    <strong>Cost:</strong>
                    ₦${Number(
                        record.cost
                    ).toLocaleString("en-NG")}
                </p>

                ${
                    record.notes
                    ? `
                        <p>
                            <strong>Notes:</strong>
                            ${record.notes}
                        </p>
                    `
                    : ""
                }


                <div class="labour-record-actions">

                    <button
                        type="button"
                        class="edit-labour-button">

                        ✏️ Edit

                    </button>


                    <button
                        type="button"
                        class="delete-labour-button">

                        🗑️ Delete

                    </button>

                </div>

            `;


            // Edit button

            card.querySelector(
                ".edit-labour-button"
            ).addEventListener(
                "click",
                () => editLabourRecord(record.id)
            );


            // Delete button

            card.querySelector(
                ".delete-labour-button"
            ).addEventListener(
                "click",
                () => deleteLabourRecord(record.id)
            );


            history.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Could not load labour history:",
            error
        );


        history.innerHTML = `

            <p class="empty-message">
                Could not load labour history.
            </p>

        `;

    }

}

async function editLabourRecord(recordId) {

    try {

        const record =
            await getRecordById(
                "labour",
                recordId
            );


        if (!record) {

            alert(
                "Labour record not found."
            );

            return;
        }


        document.getElementById(
            "farmLabourDate"
        ).value =
            record.date || "";


        document.getElementById(
            "farmLabourWorkers"
        ).value =
            record.workers || "";


        document.getElementById(
            "farmLabourType"
        ).value =
            record.type || "";


        document.getElementById(
            "farmLabourCost"
        ).value =
            record.cost || "";


        document.getElementById(
            "farmLabourNotes"
        ).value =
            record.notes || "";


        editingLabourRecordId =
            recordId;


        document.getElementById(
            "saveLabourButton"
        ).textContent =
            "💾 Update Labour Record";


        document.getElementById(
            "farmLabourSection"
        ).scrollIntoView({
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Could not edit labour record:",
            error
        );

        alert(
            "❌ Could not open labour record for editing."
        );

    }

}

async function deleteLabourRecord(recordId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this labour record?"
        );


    if (!confirmed) {

        return;

    }


    try {

        await deleteRecord(
            "labour",
            recordId
        );


        alert(
            "🗑️ Labour record deleted successfully."
        );


        await loadLabourHistory();
        await updateFinancialSummary();


    } catch (error) {

        console.error(
            "Could not delete labour record:",
            error
        );

        alert(
            "❌ Could not delete labour record."
        );

    }

}

function setupSalesForm() {

    const salesButton =
        document.getElementById(
            "salesButton"
        );

    const salesSection =
        document.getElementById(
            "farmSalesSection"
        );

    const backButton =
        document.getElementById(
            "farmSalesBackButton"
        );

    const saveButton =
        document.getElementById(
            "saveSalesButton"
        );


    // Open Sales

    salesButton.addEventListener(
        "click",
        () => {

            salesSection.style.display =
                "block";

            salesSection.scrollIntoView({
                behavior: "smooth"
            });

            setSalesDate();

            loadSalesHistory();
            

        }
    );


    // Back to Dashboard

    backButton.addEventListener(
        "click",
        () => {

            salesSection.style.display =
                "none";

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );


    // Save Sale

    saveButton.addEventListener(
        "click",
        saveSalesRecord
    );

}

function setSalesDate() {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    document.getElementById(
        "farmSalesDate"
    ).value = today;

}

async function saveSalesRecord() {

    const record = {

        date:
            document.getElementById(
                "farmSalesDate"
            ).value,

        product:
            document.getElementById(
                "farmSalesProduct"
            ).value,

        quantity:
            Number(
                document.getElementById(
                    "farmSalesQuantity"
                ).value
            ) || 0,

        unit:
            document.getElementById(
                "farmSalesUnit"
            ).value,

        amount:
            Number(
                document.getElementById(
                    "farmSalesAmount"
                ).value
            ) || 0,

        customer:
            document.getElementById(
                "farmSalesCustomer"
            ).value.trim(),

        notes:
            document.getElementById(
                "farmSalesNotes"
            ).value.trim(),

        createdAt:
            new Date().toISOString()

    };


    if (!record.date) {

        alert(
            "Please select the sale date."
        );

        return;
    }


    if (!record.product) {

        alert(
            "Please select a product."
        );

        return;
    }


    if (record.quantity <= 0) {

        alert(
            "Please enter a valid quantity."
        );

        return;
    }


    if (!record.unit) {

        alert(
            "Please select a unit."
        );

        return;
    }


    if (record.amount <= 0) {

        alert(
            "Please enter a valid amount."
        );

        return;
    }


    try {

        // EDIT MODE

        if (editingSalesRecordId !== null) {

            const oldRecord =
                await getRecordById(
                    "sales",
                    editingSalesRecordId
                );


            if (!oldRecord) {

                alert(
                    "Sales record not found."
                );

                return;
            }


            record.id =
                editingSalesRecordId;

            record.createdAt =
                oldRecord.createdAt;

            record.updatedAt =
                new Date().toISOString();


            await updateRecord(
                "sales",
                record
            );


            console.log(
                "💵 Sale updated:",
                record
            );


            alert(
                "✅ Sale updated successfully!"
            );


            editingSalesRecordId = null;


            document.getElementById(
                "saveSalesButton"
            ).textContent =
                "💾 Save Sale";

        }

        // NEW SALE MODE

        else {

            const id =
                await addRecord(
                    "sales",
                    record
                );


            console.log(
                "💵 Sale saved:",
                record
            );

            console.log(
                "Sale ID:",
                id
            );


            alert(
                "✅ Sale recorded successfully!"
            );

        }


        clearSalesForm();


        await loadSalesHistory();
        await updateFinancialSummary();


    } catch (error) {

        console.error(
            "Could not save/update sale:",
            error
        );

        alert(
            "❌ Could not save sale."
        );

    }

}function clearSalesForm() {

    document.getElementById(
        "farmSalesProduct"
    ).value = "";

    document.getElementById(
        "farmSalesQuantity"
    ).value = "";

    document.getElementById(
        "farmSalesUnit"
    ).value = "";

    document.getElementById(
        "farmSalesAmount"
    ).value = "";

    document.getElementById(
        "farmSalesCustomer"
    ).value = "";

    document.getElementById(
        "farmSalesNotes"
    ).value = "";

}

async function loadSalesHistory() {

    const history =
        document.getElementById(
            "farmSalesHistory"
        );


    try {

        const sales =
            await getAllRecords(
                "sales"
            );


        history.innerHTML = "";


        if (sales.length === 0) {

            history.innerHTML = `

                <p class="empty-message">
                    No sales recorded yet.
                </p>

            `;

            return;
        }


        // Newest sales first

        sales.sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );


        sales.forEach(sale => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "sales-record-card";


            card.innerHTML = `

                <h4>
                    💵 Sale — ${sale.date}
                </h4>

                <p>
                    <strong>Product:</strong>
                    ${sale.product}
                </p>

                <p>
                    <strong>Quantity:</strong>
                    ${sale.quantity}
                    ${sale.unit}
                </p>

                <p>
                    <strong>Amount:</strong>
                    ₦${Number(
                        sale.amount
                    ).toLocaleString("en-NG")}
                </p>

                ${
                    sale.customer
                    ? `
                        <p>
                            <strong>Buyer:</strong>
                            ${sale.customer}
                        </p>
                    `
                    : ""
                }

                ${
                    sale.notes
                    ? `
                        <p>
                            <strong>Notes:</strong>
                            ${sale.notes}
                        </p>
                    `
                    : ""
                }


                <div class="sales-record-actions">

                    <button
                        type="button"
                        class="edit-sales-button">

                        ✏️ Edit

                    </button>


                    <button
                        type="button"
                        class="delete-sales-button">

                        🗑️ Delete

                    </button>

                </div>

            `;


            // Edit button

            card.querySelector(
                ".edit-sales-button"
            ).addEventListener(
                "click",
                () => editSalesRecord(sale.id)
            );


            // Delete button

            card.querySelector(
                ".delete-sales-button"
            ).addEventListener(
                "click",
                () => deleteSalesRecord(sale.id)
            );


            history.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Could not load sales history:",
            error
        );


        history.innerHTML = `

            <p class="empty-message">
                Could not load sales history.
            </p>

        `;

    }

}

async function editSalesRecord(recordId) {

    try {

        const sale =
            await getRecordById(
                "sales",
                recordId
            );


        if (!sale) {

            alert(
                "Sales record not found."
            );

            return;
        }


        document.getElementById(
            "farmSalesDate"
        ).value =
            sale.date || "";


        document.getElementById(
            "farmSalesProduct"
        ).value =
            sale.product || "";


        document.getElementById(
            "farmSalesQuantity"
        ).value =
            sale.quantity || "";


        document.getElementById(
            "farmSalesUnit"
        ).value =
            sale.unit || "";


        document.getElementById(
            "farmSalesAmount"
        ).value =
            sale.amount || "";


        document.getElementById(
            "farmSalesCustomer"
        ).value =
            sale.customer || "";


        document.getElementById(
            "farmSalesNotes"
        ).value =
            sale.notes || "";


        editingSalesRecordId =
            recordId;


        document.getElementById(
            "saveSalesButton"
        ).textContent =
            "💾 Update Sale";


        document.getElementById(
            "farmSalesSection"
        ).scrollIntoView({
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Could not edit sales record:",
            error
        );

        alert(
            "❌ Could not open sale for editing."
        );

    }

}

async function deleteSalesRecord(recordId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this sales record?"
        );


    if (!confirmed) {

        return;

    }


    try {

        await deleteRecord(
            "sales",
            recordId
        );


        alert(
            "🗑️ Sale deleted successfully."
        );


        await loadSalesHistory();
        await updateFinancialSummary();


    } catch (error) {

        console.error(
            "Could not delete sales record:",
            error
        );

        alert(
            "❌ Could not delete sale."
        );

    }

}

async function updateFinancialSummary() {

    try {

        const sales =
            await getAllRecords("sales");

        const expenses =
            await getAllRecords("expenses");

        const labour =
            await getAllRecords("labour");


        // =========================
        // TOTAL INCOME
        // =========================

        const totalIncome =
            sales.reduce(
                (total, sale) =>
                    total +
                    Number(sale.amount || 0),
                0
            );


        // =========================
        // TOTAL EXPENSES
        // =========================

        const totalExpenses =
            expenses.reduce(
                (total, expense) =>
                    total +
                    Number(expense.amount || 0),
                0
            );


        // =========================
        // TOTAL LABOUR
        // =========================

        const totalLabour =
            labour.reduce(
                (total, record) =>
                    total +
                    Number(record.cost || 0),
                0
            );


        // =========================
        // PROFIT
        // =========================

        const netProfit =
            totalIncome -
            totalExpenses -
            totalLabour;


        // =========================
        // UPDATE DASHBOARD
        // =========================

        document.getElementById(
            "dashboardExpenses"
        ).textContent =
            `₦${(
                totalExpenses +
                totalLabour
            ).toLocaleString("en-NG")}`;


        document.getElementById(
            "dashboardIncome"
        ).textContent =
            `₦${totalIncome.toLocaleString(
                "en-NG"
            )}`;


        document.getElementById(
            "dashboardProfit"
        ).textContent =
            `₦${netProfit.toLocaleString(
                "en-NG"
            )}`;


        console.log(
            "📊 Dashboard financial summary:",
            {
                income: totalIncome,
                expenses: totalExpenses,
                labour: totalLabour,
                profit: netProfit
            }
        );


    } catch (error) {

        console.error(
            "Could not update dashboard financial summary:",
            error
        );

    }

}

async function deleteCrop(cropId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this crop and all of its activity history?"
        );


    if (!confirmed) {
        return;
    }


    try {

        // Get all crop activities

        const activities =
            await getAllRecords(
                "cropActivities"
            );


        // Find activities belonging to this crop

        const cropActivities =
            activities.filter(
                activity =>
                    Number(activity.cropId) ===
                    Number(cropId)
            );


        // Delete the crop's activities

        for (
            const activity
            of cropActivities
        ) {

            await deleteRecord(
                "cropActivities",
                activity.id
            );

        }


        // Delete the crop itself

        await deleteRecord(
            "crops",
            cropId
        );


        console.log(
            "🌱 Crop deleted:",
            cropId
        );


        alert(
            "🗑️ Crop and its activity history deleted successfully."
        );


        // Clear selected crop

        currentCropId = null;


        // Hide crop details

        document.getElementById(
            "cropDetailsSection"
        ).style.display = "none";


        // Show crop list

        document.getElementById(
            "cropListSection"
        ).style.display = "block";


        // Refresh crop list

        await loadCropList();


    } catch (error) {

        console.error(
            "Could not delete crop:",
            error
        );


        alert(
            "❌ Could not delete crop."
        );

    }

}
async function loadDailyRecordsHistory() {

    const history =
        document.getElementById(
            "dailyRecordsHistory"
        );


    if (!history) {
        return;
    }


    try {

        const records =
            await getAllRecords(
                "dailyRecords"
            );


        history.innerHTML = "";


        if (records.length === 0) {

            history.innerHTML = `

                <p class="empty-message">
                    No daily records recorded yet.
                </p>

            `;

            return;
        }


        // Newest records first

        records.sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );


        records.forEach(record => {

            const card =
                document.createElement("div");


            card.className =
                "daily-record-card";


            const poultry =
                record.poultry || {};

            const crops =
                record.crops || {};

            const labour =
                record.labour || {};

            const expenses =
                record.expenses || {};

            const sales =
                record.sales || {};


            card.innerHTML = `

                <h3>
                    📝 ${record.date}
                </h3>


                <div class="daily-record-group">

                    <h4>🐔 Poultry</h4>

                    <p>
                        <strong>Birds Present:</strong>
                        ${poultry.birdsPresent || 0}
                    </p>

                    <p>
                        <strong>Eggs Collected:</strong>
                        ${poultry.eggsCollected || 0}
                    </p>

                    <p>
                        <strong>Broken Eggs:</strong>
                        ${poultry.brokenEggs || 0}
                    </p>

                    <p>
                        <strong>Bird Deaths:</strong>
                        ${poultry.birdDeaths || 0}
                    </p>

                    <p>
                        <strong>Feed Used:</strong>
                        ${poultry.feedUsed || 0} kg
                    </p>

                </div>


                <div class="daily-record-group">

                    <h4>🌱 Crops</h4>

                    <p>
                        <strong>Crop:</strong>
                        ${crops.cropName || "None"}
                    </p>

                    <p>
                        <strong>Activity:</strong>
                        ${crops.activity || "None"}
                    </p>

                    <p>
                        <strong>Harvest:</strong>
                        ${crops.harvestKg || 0} kg
                    </p>

                </div>


                <div class="daily-record-group">

                    <h4>👷 Labour</h4>

                    <p>
                        <strong>Workers:</strong>
                        ${labour.workers || 0}
                    </p>

                    <p>
                        <strong>Cost:</strong>
                        ₦${Number(
                            labour.cost || 0
                        ).toLocaleString("en-NG")}
                    </p>

                </div>


                <div class="daily-record-group">

                    <h4>💰 Expenses</h4>

                    <p>
                        <strong>Category:</strong>
                        ${expenses.category || "None"}
                    </p>

                    <p>
                        <strong>Amount:</strong>
                        ₦${Number(
                            expenses.amount || 0
                        ).toLocaleString("en-NG")}
                    </p>

                </div>


                <div class="daily-record-group">

                    <h4>🧺 Sales</h4>

                    <p>
                        <strong>Eggs Sold:</strong>
                        ${sales.eggsSold || 0}
                    </p>

                    <p>
                        <strong>Egg Sales:</strong>
                        ₦${Number(
                            sales.eggSales || 0
                        ).toLocaleString("en-NG")}
                    </p>

                    <p>
                        <strong>Vegetable Sales:</strong>
                        ₦${Number(
                            sales.vegetableSales || 0
                        ).toLocaleString("en-NG")}
                    </p>

                </div>


                ${
                    record.notes
                    ? `

                        <div class="daily-record-group">

                            <h4>📝 Notes</h4>

                            <p>
                                ${record.notes}
                            </p>

                        </div>

                    `
                    : ""
                }

            `;
            


            // Add Edit and Delete buttons

            const actions =
                document.createElement("div");

            actions.className =
                "daily-record-actions";


            const editButton =
                document.createElement("button");

            editButton.type = "button";

            editButton.className =
                "edit-daily-record-button";

            editButton.textContent =
                "✏️ Edit";


            const deleteButton =
                document.createElement("button");

            deleteButton.type = "button";

            deleteButton.className =
                "delete-daily-record-button";

            deleteButton.textContent =
                "🗑️ Delete";


            actions.appendChild(editButton);

            actions.appendChild(deleteButton);


            card.appendChild(actions);


            // Edit button

            editButton.addEventListener(
                "click",
                () => editDailyRecord(record.id)
            );


            // Delete button

            deleteButton.addEventListener(
                "click",
                () => deleteDailyRecord(record.id)
            );

            history.appendChild(card);

               

        });


    } catch (error) {

        console.error(
            "Could not load daily records history:",
            error
        );


        history.innerHTML = `

            <p class="empty-message">
                Could not load daily records.
            </p>

        `;

    }

}

function setupDailyHistoryNavigation() {

    const viewButton =
        document.getElementById(
            "viewDailyHistoryButton"
        );

    const hideButton =
        document.getElementById(
            "hideDailyHistoryButton"
        );

    const historySection =
        document.getElementById(
            "dailyHistorySection"
        );


    if (!viewButton || !hideButton || !historySection) {
        return;
    }


    // Show history

    viewButton.addEventListener(
        "click",
        async () => {

            historySection.style.display = "block";

            await loadDailyRecordsHistory();

            historySection.scrollIntoView({
                behavior: "smooth"
            });

        }
    );


    // Hide history

    hideButton.addEventListener(
        "click",
        () => {

            historySection.style.display = "none";

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );

}
async function deleteDailyRecord(recordId) {

    const confirmed = confirm(
        "Are you sure you want to delete this daily record?"
    );

    if (!confirmed) {
        return;
    }

    try {

        await deleteRecord(
            "dailyRecords",
            recordId
        );

        alert(
            "✅ Daily record deleted successfully."
        );

        // Refresh the history
        await loadDailyRecordsHistory();

    } catch (error) {

        console.error(
            "Could not delete daily record:",
            error
        );

        alert(
            "❌ Could not delete daily record."
        );

    }

}

async function editDailyRecord(recordId) {

    try {

        const record =
            await getRecordById(
                "dailyRecords",
                recordId
            );


        if (!record) {

            alert(
                "Daily record not found."
            );

            return;
        }


        // Remember which record we are editing

        editingDailyRecordId = recordId;
                    console.log(
                "✏️ Editing daily record ID:",
                recordId
            );

            console.log(
                "✏️ editingDailyRecordId:",
                editingDailyRecordId
            );


        // Show the daily record form

        const dailyForm =
            document.getElementById(
                "dailyForm"
            );

        dailyForm.style.display = "block";


        // =========================
        // DATE
        // =========================

        document.getElementById(
            "dailyDate"
        ).value =
            record.date || "";


        // =========================
        // POULTRY
        // =========================

        document.getElementById(
            "birdsPresent"
        ).value =
            record.poultry?.birdsPresent || 0;

        document.getElementById(
            "eggsCollected"
        ).value =
            record.poultry?.eggsCollected || 0;

        document.getElementById(
            "brokenEggs"
        ).value =
            record.poultry?.brokenEggs || 0;

        document.getElementById(
            "birdDeaths"
        ).value =
            record.poultry?.birdDeaths || 0;

        document.getElementById(
            "feedUsed"
        ).value =
            record.poultry?.feedUsed || 0;


        // =========================
        // CROPS
        // =========================

        document.getElementById(
            "cropName"
        ).value =
            record.crops?.cropName || "";

        document.getElementById(
            "cropActivity"
        ).value =
            record.crops?.activity || "";

        document.getElementById(
            "harvestKg"
        ).value =
            record.crops?.harvestKg || 0;


        // =========================
        // LABOUR
        // =========================

        document.getElementById(
            "workers"
        ).value =
            record.labour?.workers || 0;

        document.getElementById(
            "labourCost"
        ).value =
            record.labour?.cost || 0;


        // =========================
        // EXPENSES
        // =========================

        document.getElementById(
            "expenseCategory"
        ).value =
            record.expenses?.category || "";

        document.getElementById(
            "expenseAmount"
        ).value =
            record.expenses?.amount || 0;


        // =========================
        // SALES
        // =========================

        document.getElementById(
            "eggsSold"
        ).value =
            record.sales?.eggsSold || 0;

        document.getElementById(
            "vegetableSales"
        ).value =
            record.sales?.vegetableSales || 0;

        document.getElementById(
            "eggSales"
        ).value =
            record.sales?.eggSales || 0;


        // =========================
        // NOTES
        // =========================

        document.getElementById(
            "dailyNotes"
        ).value =
            record.notes || "";


        // Change button to Update

        document.getElementById(
            "saveDailyButton"
        ).textContent =
            "💾 Update Daily Record";


        // Scroll to form

        dailyForm.scrollIntoView({
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Could not edit daily record:",
            error
        );

        alert(
            "❌ Could not open daily record for editing."
        );

    }

}

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./service-worker.js")
            .then(() => {

                console.log(
                    "🌱 FarmKeeper service worker registered."
                );

            })
            .catch(error => {

                console.error(
                    "Service worker registration failed:",
                    error
                );

            });

    });

}