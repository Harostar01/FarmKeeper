let currentCropId = null;
let editingEggRecordId = null;
let editingExpenseRecordId = null;
let editingLabourRecordId = null;
let editingSalesRecordId = null;
let editingDailyRecordId = null;
let farmKeeperProfile = null;
let savingCropRecord = false;
let cropCleanupPromise = null;
let cropListLoadPromise = null;
let cropListRenderToken = 0;

document.addEventListener("DOMContentLoaded", async () => {

    try {

        await openDatabase();
        await dedupeCropRecords();
        await migrateLegacyFinanceRecords();
        await setupUserProfile();

        setupProfileEditor();
        setupBackupRestore();
        setupBottomNavigation();
setupHomeSearch();
        setupFarmKeeperAI();
        setupPhase2Features();

        console.log("🌱 FarmKeeper is ready.");

        setupVisitForm();
        setupCropForm();
        setupCropNavigation();
        setupCropActivityForm();
        setupCropWorkspace();
        setupFlockForm();
        setupAnimalWorkspace();
        setupPoultryNavigation();
        setupEggProductionForm();
        setupExpenseNavigation();
        setupExpenseForm();
        setupLabourForm();
        setupSalesForm();
        await setupFinanceWorkspace();
        await populateFinanceEntitySelectors();
        await Promise.all([loadLabourHistory(), loadSalesHistory()]);
        updateFinancialSummary();
        setupReportsNavigation();
        setupReportGenerator();
        setupReminderNavigation();
        setupReminderForm();
        setupReminderNotificationButton();
        checkTaskReminders();
        checkDailyRecordReminder();
        setupDailyRecord();
        setupDailyHistoryNavigation();
        updateLastVisit();
        loadVisitHistory();
        populateReminderTargets();
        loadReminders();

    } catch (error) {

        console.error("FarmKeeper database error:", error);

    }

});


function setupVisitForm() {
    const recordVisitButton=document.getElementById("recordVisitButton");
    const saveVisitButton=document.getElementById("saveVisitButton");
    const back=document.getElementById("visitBackButton");
    recordVisitButton?.addEventListener("click",()=>{ showMorePanel("visit"); setCurrentDateTime(); loadVisitHistory(); });
    saveVisitButton?.addEventListener("click",saveFarmVisit);
    back?.addEventListener("click",()=>showMorePanel("menu"));
}
function setCurrentDateTime(){ const now=new Date(); document.getElementById("visitDate").value=now.toISOString().split("T")[0]; document.getElementById("visitTime").value=now.toTimeString().slice(0,5); }
function clearVisitForm(){ ["visitLocation","visitWeather","visitCropObservations","visitAnimalObservations","visitProblems","visitNotes","visitExpenseAmount","visitExpenseDetails"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";}); const photo=document.getElementById("visitPhotoInput");if(photo)photo.value=""; }
function readFilesAsDataUrls(files){ return Promise.all(Array.from(files||[]).map(file=>new Promise((resolve,reject)=>{ if(!file.type.startsWith("image/")) return reject(new Error("Only image files are allowed.")); if(file.size>5*1024*1024) return reject(new Error("Each photo must be smaller than 5 MB.")); const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(r.error||new Error("Could not read photo.")); r.readAsDataURL(file);}))); }
async function saveFarmVisit(){
    const date=document.getElementById("visitDate")?.value, time=document.getElementById("visitTime")?.value||"";
    if(!date){alert("Please select the visit date.");return;}
    const visit={date,time,location:document.getElementById("visitLocation")?.value.trim()||"",weather:document.getElementById("visitWeather")?.value.trim()||"",cropObservations:document.getElementById("visitCropObservations")?.value.trim()||"",animalObservations:document.getElementById("visitAnimalObservations")?.value.trim()||"",problems:document.getElementById("visitProblems")?.value.trim()||"",notes:document.getElementById("visitNotes")?.value.trim()||"",expenseAmount:Number(document.getElementById("visitExpenseAmount")?.value)||0,expenseDetails:document.getElementById("visitExpenseDetails")?.value.trim()||"",createdAt:new Date().toISOString()};
    const files=document.getElementById("visitPhotoInput")?.files||[];
    if(visit.expenseAmount>0 && !visit.expenseDetails){alert("Please describe the expense made.");return;}
    try{
        const visitId=await addRecord("visits",visit);
        if(visit.expenseAmount>0){ await addRecord("expenses",{date:visit.date,description:visit.expenseDetails,amount:visit.expenseAmount,category:"Farm Visit",linkedEntity:{kind:"visit",id:visitId},source:"farmVisit",createdAt:visit.createdAt}); }
        if(files.length){ const urls=await readFilesAsDataUrls(files); for(const dataUrl of urls) await addRecord("photos",{target:`visit:${visitId}`,caption:`Farm visit — ${visit.date}`,dataUrl,createdAt:new Date().toISOString()}); }
        alert("✅ Farm visit saved successfully!"); clearVisitForm(); setCurrentDateTime(); await updateLastVisit(); await loadVisitHistory();
    }catch(e){console.error("Error saving farm visit:",e);alert(`❌ Could not save the farm visit. ${e.message||""}`);}
}
async function updateLastVisit(){ try{ const visits=await getAllRecords("visits"); if(!visits.length)return; visits.sort((a,b)=>new Date(`${b.date}T${b.time||"00:00"}`)-new Date(`${a.date}T${a.time||"00:00"}`)); const el=document.getElementById("dashboardLastVisitText"); if(el)el.textContent=formatVisitDate(visits[0].date); }catch(e){console.error("Could not update last visit:",e);} }
function formatVisitDate(dateString){ const date=new Date(dateString+"T00:00:00"),today=new Date(); const ds=date.toISOString().split("T")[0],ts=today.toISOString().split("T")[0]; if(ds===ts)return"Today"; const yesterday=new Date(today);yesterday.setDate(today.getDate()-1);if(ds===yesterday.toISOString().split("T")[0])return"Yesterday";return date.toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"}); }
async function loadVisitHistory(){
    const out=document.getElementById("visitHistory");if(!out)return;
    try{ const visits=await getAllRecords("visits"); visits.sort((a,b)=>new Date(`${b.date}T${b.time||"00:00"}`)-new Date(`${a.date}T${a.time||"00:00"}`)); if(!visits.length){out.innerHTML='<p class="empty-message">No farm visits recorded yet.</p>';return;}
        out.innerHTML=visits.map(v=>`<article class="visit-diary-card"><div class="visit-diary-heading"><h3>📍 Farm Visit — ${formatVisitDate(v.date)}</h3><button type="button" class="small-button danger-button" onclick="deleteFarmVisit(${Number(v.id)})">🗑️ Delete</button></div><p><strong>📅</strong> ${escapeHtml(v.date)}${v.time?` at ${escapeHtml(v.time)}`:""}</p>${v.location?`<p>📍 <strong>Location:</strong> ${escapeHtml(v.location)}</p>`:""}${v.weather?`<p>🌦️ <strong>Weather:</strong> ${escapeHtml(v.weather)}</p>`:""}${v.cropObservations?`<div><strong>🌱 Crop observations</strong><p>${escapeHtml(v.cropObservations)}</p></div>`:""}${v.animalObservations?`<div><strong>🐔 Animal observations</strong><p>${escapeHtml(v.animalObservations)}</p></div>`:""}${v.problems?`<div class="visit-problem"><strong>⚠️ Problems discovered</strong><p>${escapeHtml(v.problems)}</p></div>`:""}${v.notes?`<div><strong>📝 Notes</strong><p>${escapeHtml(v.notes)}</p></div>`:""}${v.expenseAmount?`<p>💰 <strong>Expense:</strong> ₦${Number(v.expenseAmount).toLocaleString("en-NG")}${v.expenseDetails?` — ${escapeHtml(v.expenseDetails)}`:""}</p>`:""}<div id="visitPhotos-${Number(v.id)}" class="visit-photos-inline"><small>📷 Loading photos...</small></div></article>`).join("");
        await Promise.all(visits.map(async v=>{const c=document.getElementById(`visitPhotos-${Number(v.id)}`);if(c)renderEntityPhotos(c,await getPhotosForTarget(`visit:${v.id}`));}));
    }catch(e){console.error("Could not load visit history",e);}
}
async function deleteFarmVisit(id){ if(!confirm("Delete this farm visit? Its visit photos will also be deleted. The linked Finance expense will remain in Finance."))return; try{ const photos=await getPhotosForTarget(`visit:${id}`); for(const photo of photos)await deleteRecord("photos",photo.id); await deleteRecord("visits",Number(id)); await loadVisitHistory(); await updateLastVisit(); alert("🗑️ Farm visit deleted."); }catch(e){console.error(e);alert("❌ Could not delete farm visit.");} }

function openDailyRecordWorkspace() {
    const nav = document.getElementById("bottomNav");
    const form = document.getElementById("dailyForm");
    const history = document.getElementById("dailyHistorySection");
    const moreMenu = document.getElementById("moreMenu");

    hideAllNavigationPanels();

    document.body.classList.add("navigation-active");
    document.body.dataset.navigation = "more";

    nav?.querySelectorAll(".bottom-nav-item").forEach(item => {
        item.classList.toggle("active", item.dataset.nav === "more");
    });

    if (moreMenu) moreMenu.style.display = "block";
    if (history) history.style.display = "none";
    if (form) form.style.display = "block";

    const date = document.getElementById("dailyDate");
    if (date && !date.value) {
        date.value = new Date().toISOString().split("T")[0];
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupDailyRecord() {

    const dailyButton =
        document.getElementById("dailyRecordButton");

    const dailyForm =
        document.getElementById("dailyForm");

    const saveButton =
        document.getElementById("saveDailyButton");
    const backButton = document.getElementById("dailyFormBackButton");


    dailyButton?.addEventListener("click", () => {
        openDailyRecordWorkspace();

        const today =
            new Date().toISOString().split("T")[0];

        document.getElementById("dailyDate").value = today;

    });


    saveButton?.addEventListener(
        "click",
        saveDailyRecord
    );

    backButton?.addEventListener("click", () => {
        dailyForm.style.display = "none";
        const history = document.getElementById("dailyHistorySection");
        if (history) history.style.display = "none";
        const moreMenu = document.getElementById("moreMenu");
        if (moreMenu) moreMenu.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

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


        const reminder = reminders.find(item => item.type === "dailyRecord") || null;


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

        const animals =
            await getAllRecords("animals");

        const crops =
            await getAllRecords("crops");


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

async function dedupeCropRecords() {
    // Run cleanup only once at a time. Older versions could start multiple
    // cleanups concurrently, which made one delete appear to remove two crops.
    if (cropCleanupPromise) return cropCleanupPromise;

    cropCleanupPromise = (async () => {
        try {
            const crops = await getAllRecords("crops");
            if (crops.length < 2) return;

            const normalize = value => String(value ?? "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");

            // This is deliberately based only on what the user sees as the
            // crop identity. It catches duplicates created by older versions
            // even when their timestamps/extra fields differ.
            const cropKey = crop => [
                normalize(crop.cropName),
                normalize(crop.variety),
                normalize(crop.plot),
                normalize(crop.plantingDate),
                String(Number(crop.quantityPlanted || 0)),
                normalize(crop.cropUnit)
            ].join("|");

            const groups = new Map();
            for (const crop of crops) {
                const key = cropKey(crop);
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(crop);
            }

            const duplicateGroups = [...groups.values()].filter(group => group.length > 1);
            if (!duplicateGroups.length) return;

            const [activities, expenses, labour, sales] = await Promise.all([
                getAllRecords("cropActivities"),
                getAllRecords("expenses"),
                getAllRecords("labour"),
                getAllRecords("sales")
            ]);

            let removed = 0;
            for (const records of duplicateGroups) {
                records.sort((a, b) => {
                    const aId = Number(a.id), bId = Number(b.id);
                    if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
                    return String(a.id).localeCompare(String(b.id));
                });

                const keeper = records[0];
                const duplicateIds = new Set(records.slice(1).map(c => String(c.id)));

                for (const activity of activities) {
                    if (duplicateIds.has(String(activity.cropId))) {
                        await updateRecord("cropActivities", { ...activity, cropId: keeper.id });
                    }
                }

                for (const [storeName, rows] of [["expenses", expenses], ["labour", labour], ["sales", sales]]) {
                    for (const row of rows) {
                        const linkedId = row.linkedEntity?.kind === "crop" ? row.linkedEntity.id : row.cropId;
                        if (duplicateIds.has(String(linkedId))) {
                            const updated = { ...row };
                            if (updated.linkedEntity?.kind === "crop") {
                                updated.linkedEntity = { ...updated.linkedEntity, id: keeper.id };
                            }
                            if (updated.cropId !== undefined) updated.cropId = keeper.id;
                            await updateRecord(storeName, updated);
                        }
                    }
                }

                // Delete duplicates one-by-one, never delete the keeper.
                for (const duplicate of records.slice(1)) {
                    await deleteRecord("crops", duplicate.id);
                    removed++;
                }
            }

            console.log(`🌱 Crop cleanup removed ${removed} duplicate record(s).`);
        } catch (error) {
            console.error("Could not clean duplicate crop records:", error);
        } finally {
            cropCleanupPromise = null;
        }
    })();

    return cropCleanupPromise;
}

function setupCropForm() {
    const cropButton = document.getElementById("cropButton");
    const cropForm = document.getElementById("cropForm");
    const addCropButton = document.getElementById("addCropButton");
    const workspaceAddButton = document.getElementById("cropWorkspaceAddButton");
    const workspaceListButton = document.getElementById("cropWorkspaceListButton");
    const closeCropFormButton = document.getElementById("closeCropFormButton");

    const openCropForm = () => {
        if (!cropForm) return;
        const body = document.body;
        body.classList.add("crop-form-open");
        cropForm.classList.add("crop-form-open");
        cropForm.style.display = "block";
        document.getElementById("cropListSection")?.style.setProperty("display", "none", "important");
        document.getElementById("cropActivityOverview")?.style.setProperty("display", "none", "important");
        const today = new Date().toISOString().split("T")[0];
        const dateInput = document.getElementById("plantingDate");
        if (dateInput && !dateInput.value) dateInput.value = today;
        cropForm.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    cropButton?.addEventListener("click", () => {
        const navButton = document.querySelector('.bottom-nav-item[data-nav="crops"]');
        if (navButton) navButton.click();
    });

    addCropButton?.addEventListener("click", openCropForm);
    // The workspace button is wired by setupCropWorkspace; do not attach a second handler here.
    workspaceListButton?.addEventListener("click", async () => {
        cropForm.style.display = "none";
        document.getElementById("cropActivityOverview")?.style.setProperty("display", "none", "important");
        const list = document.getElementById("cropListSection");
        if (list) { list.style.display = "block"; list.scrollIntoView({behavior:"smooth", block:"start"}); }
        await loadCropList();
    });
    closeCropFormButton?.addEventListener("click", () => {
        cropForm.style.display = "none";
        cropForm.classList.remove("crop-form-open");
        document.body.classList.remove("crop-form-open");
    });

    document.getElementById("saveCropButton")?.addEventListener("click", saveCropRecord);

    // Expose a small, controlled helper for empty-state buttons.
    window.openFarmKeeperCropForm = openCropForm;
}

async function saveCropRecord() {

    // Prevent double-clicks / duplicate submissions while IndexedDB is saving.
    if (savingCropRecord) return;
    savingCropRecord = true;

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
        savingCropRecord = false;
        return;
    }


    if (!cropRecord.plantingDate) {

        alert("Please select the planting date.");
        savingCropRecord = false;
        return;
    }


    try {

        const existingCrops = await getAllRecords("crops");
        const duplicate = existingCrops.find(existing =>
            String(existing.cropName || "").trim().toLowerCase() === String(cropRecord.cropName).trim().toLowerCase() &&
            String(existing.variety || "").trim().toLowerCase() === String(cropRecord.variety || "").trim().toLowerCase() &&
            String(existing.plot || "").trim().toLowerCase() === String(cropRecord.plot || "").trim().toLowerCase() &&
            String(existing.plantingDate || "") === String(cropRecord.plantingDate || "") &&
            Number(existing.quantityPlanted || 0) === Number(cropRecord.quantityPlanted || 0)
        );

        if (duplicate) {
            alert("This crop record already exists. I did not create a duplicate.");
            savingCropRecord = false;
            currentCropId = duplicate.id;
            await loadCropList();
            return;
        }

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

        document.body.classList.remove("crop-form-open");
        document.getElementById("cropForm")?.classList.remove("crop-form-open");
        if (document.getElementById("cropForm")) {
            document.getElementById("cropForm").style.display = "none";
        }


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


        // Show the saved crop list and refresh finance selectors.
        const cropList = document.getElementById("cropListSection");
        if (cropList) { cropList.classList.add("crop-list-open"); cropList.style.display = "block"; }
        const cropOverview = document.getElementById("cropActivityOverview");
        if (cropOverview) { cropOverview.classList.remove("crop-overview-open"); cropOverview.style.display = "none"; }
        await loadCropList();
        await populateFinanceEntitySelectors();
        savingCropRecord = false;


    } catch (error) {

        console.error(
            "Could not save crop record:",
            error
        );

        alert(
            "❌ Could not save crop record."
        );
        savingCropRecord = false;

    }

}

async function saveCropActivity() {

    const selectedCropId = Number(document.getElementById("activityCropSelect")?.value || currentCropId || 0);
    if (!selectedCropId) {
        alert("Please select a crop before adding an activity.");
        return;
    }
    const activity = {

        cropId: selectedCropId,

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

        // Keep the crop status in sync with activity.
        try {
            const crop = await getRecordById("crops", currentCropId);
            if (crop) {
                if (activity.type === "Harvesting") crop.status = "Harvesting";
                await updateRecord("crops", crop);
            }
        } catch (statusError) {
            console.warn("Could not update crop status:", statusError);
        }

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
    const cropList = document.getElementById("cropList");
    if (!cropList) return;

    // Serialize list loads. Older versions could call loadCropList() from
    // several navigation handlers at the same time. Each call would then
    // render the same IndexedDB record, producing two identical cards with
    // the SAME id. Deleting one card consequently looked like two crops were
    // deleted because both cards represented the same database record.
    if (cropListLoadPromise) return cropListLoadPromise;

    const renderToken = ++cropListRenderToken;
    cropListLoadPromise = (async () => {
        try {
            const rawCrops = await getAllRecords("crops");
            const normalize = value => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

            // De-duplicate only the rendered list. We do NOT delete records
            // here. Database cleanup is intentionally limited to startup so
            // a normal refresh/delete can never remove another crop.
            const seenKeys = new Set();
            const crops = rawCrops.filter(crop => {
                const key = [
                    normalize(crop.cropName),
                    normalize(crop.variety),
                    normalize(crop.plot),
                    normalize(crop.plantingDate),
                    String(Number(crop.quantityPlanted || 0))
                ].join("|");
                if (seenKeys.has(key)) return false;
                seenKeys.add(key);
                return true;
            });

            crops.sort((a,b) => new Date(b.plantingDate || b.createdAt) - new Date(a.plantingDate || a.createdAt));

            // Ignore an older async render if a newer load has started.
            if (renderToken !== cropListRenderToken) return;
            cropList.replaceChildren();

            if (!crops.length) {
                cropList.innerHTML = '<div class="crop-empty-state"><div class="crop-empty-icon">🌱</div><h3>No crops yet</h3><p>Add your first crop to start tracking planting, activities and harvests.</p><button type="button" class="small-button" id="emptyAddCropButton">＋ Add First Crop</button></div>';
                document.getElementById("emptyAddCropButton")?.addEventListener("click", () => window.openFarmKeeperCropForm?.());
                return;
            }

            const activities = await getAllRecords("cropActivities");
            const activityCounts = new Map();
            activities.forEach(a => activityCounts.set(String(a.cropId), (activityCounts.get(String(a.cropId)) || 0) + 1));

            if (renderToken !== cropListRenderToken) return;

            // Build the complete fragment first, then attach it once. This
            // prevents partial duplicate rendering during async operations.
            const fragment = document.createDocumentFragment();
            crops.forEach(crop => {
                const card = document.createElement("div");
                card.className = "crop-card crop-card-enhanced";
                const status = crop.status || "Growing";
                card.innerHTML = `
                    <div class="crop-card-top">
                        <div><h3>🌱 ${crop.cropName}</h3><p>${crop.variety || "Variety not specified"}${crop.plot ? ` · ${crop.plot}` : ""}</p></div>
                        <span class="crop-status-badge">${status}</span>
                    </div>
                    <div class="crop-mini-stats">
                        <span>📅 ${crop.plantingDate || "No date"}</span>
                        <span>📦 ${crop.quantityPlanted || 0} ${crop.cropUnit || ""}</span>
                        <span>📜 ${activityCounts.get(String(crop.id)) || 0} activities</span>
                    </div>
                    <button type="button" class="small-button crop-view-button">View Crop →</button>`;
                card.querySelector("button").addEventListener("click", () => viewCrop(crop.id));
                fragment.appendChild(card);
            });
            cropList.replaceChildren(fragment);
        } catch (error) {
            console.error("Could not load crop list:", error);
            if (renderToken === cropListRenderToken) cropList.innerHTML = '<p class="empty-message">Could not load crops.</p>';
        } finally {
            cropListLoadPromise = null;
        }
    })();

    return cropListLoadPromise;
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

        <div class="crop-finance" id="cropFinance">
            <h3>💰 Crop Finance</h3>
            <div class="crop-performance-grid">
                <div><strong id="cropCostValue">₦0</strong><span>Costs</span></div>
                <div><strong id="cropRevenueValue">₦0</strong><span>Sales</span></div>
                <div><strong id="cropProfitValue">₦0</strong><span>Profit</span></div>
            </div>
        </div>

        <div class="crop-performance" id="cropPerformance">
            <h3>📊 Crop Performance</h3>
            <div class="crop-performance-grid">
                <div><strong id="cropDaysValue">—</strong><span>Days tracked</span></div>
                <div><strong id="cropActivityCountValue">—</strong><span>Activities</span></div>
                <div><strong id="cropHarvestValue">0</strong><span>Harvest quantity</span></div>
            </div>
        </div>

        <div class="entity-photos-section">
            <h3>📷 Photos</h3>
            <div id="cropPhotos" class="entity-photos-grid"><p class="empty-message">Loading photos...</p></div>
        </div>

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
try {
    const cropPhotos = await getPhotosForTarget(`crop:${cropId}`);
    renderEntityPhotos(document.getElementById("cropPhotos"), cropPhotos);
} catch (photoError) { console.warn("Could not load crop photos:", photoError); }

document
    .getElementById("deleteCropButton")
    .addEventListener(
        "click",
        () => deleteCrop(cropId)
    );


        // Load activities for this crop

        await loadCropActivities(cropId);

        try {
            const activities = await getAllRecords("cropActivities");
            const cropActivities = activities.filter(a => a.cropId === cropId);
            const planting = crop.plantingDate ? new Date(crop.plantingDate) : new Date();
            const days = Math.max(0, Math.floor((Date.now() - planting.getTime()) / 86400000));
            const harvestQty = cropActivities.filter(a => a.type === "Harvesting").reduce((sum,a) => sum + Number(a.quantity || 0), 0);
            document.getElementById("cropDaysValue").textContent = days;
            document.getElementById("cropActivityCountValue").textContent = cropActivities.length;
            document.getElementById("cropHarvestValue").textContent = `${harvestQty} ${cropActivities.find(a => a.type === "Harvesting" && a.unit)?.unit || ""}`.trim();
            const [expenses, labour, sales] = await Promise.all([getAllRecords("expenses"), getAllRecords("labour"), getAllRecords("sales")]);
            const cost = expenses.filter(x => x.linkedEntity && x.linkedEntity.kind === "crop" && Number(x.linkedEntity.id) === Number(cropId)).reduce((n,x)=>n+Number(x.amount||0),0)
                + labour.filter(x => x.linkedEntity && x.linkedEntity.kind === "crop" && Number(x.linkedEntity.id) === Number(cropId)).reduce((n,x)=>n+Number(x.cost||0),0);
            const revenue = sales.filter(x => x.linkedEntity && x.linkedEntity.kind === "crop" && Number(x.linkedEntity.id) === Number(cropId)).reduce((n,x)=>n+Number(x.amount||0),0);
            document.getElementById("cropCostValue").textContent = `₦${cost.toLocaleString("en-NG")}`;
            document.getElementById("cropRevenueValue").textContent = `₦${revenue.toLocaleString("en-NG")}`;
            const cropProfit = revenue - cost;
            const cropProfitValue = document.getElementById("cropProfitValue");
            if (cropProfitValue) {
                cropProfitValue.textContent = `₦${cropProfit.toLocaleString("en-NG")}`;
                applyFinancialTone(cropProfitValue, cropProfit);
                const cropProfitLabel = cropProfitValue.parentElement?.querySelector('span');
                if (cropProfitLabel) cropProfitLabel.textContent = cropProfit < 0 ? "Loss" : "Profit";
            }
        } catch (perfError) { console.warn("Could not calculate crop performance:", perfError); }

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


            const list = document.getElementById("cropListSection");
            const overview = document.getElementById("cropActivityOverview");
            if (overview) { overview.classList.remove("crop-overview-open"); overview.style.display = "none"; }
            if (list) { list.classList.add("crop-list-open"); list.style.display = "block"; }

    
        }
    );

}

async function populateCropActivitySelector(selectedId = null) {
    const select = document.getElementById("activityCropSelect");
    if (!select) return;
    try {
        const crops = await getAllRecords("crops");
        select.innerHTML = '<option value="">Select crop</option>' + crops.map(c => `<option value="${c.id}">${c.cropName}${c.plot ? ` — ${c.plot}` : ""}</option>`).join("");
        if (selectedId) select.value = String(selectedId);
    } catch (e) { console.warn("Could not load crop selector:", e); }
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


        populateCropActivitySelector(currentCropId);

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
            await loadCropActivityOverview();

        }
    );

}

function setupCropWorkspace() {
    const addButton = document.getElementById("cropWorkspaceAddButton");
    const listButton = document.getElementById("cropWorkspaceListButton");
    const activitiesButton = document.getElementById("cropWorkspaceActivitiesButton");
    const overviewAddButton = document.getElementById("cropOverviewAddActivityButton");

    // Workspace actions are wired here so each button has one clear purpose.
    if (addButton) {
        addButton.addEventListener("click", () => {
            if (typeof window.openFarmKeeperCropForm === "function") {
                window.openFarmKeeperCropForm();
            }
        });
    }

    if (listButton) {
        listButton.addEventListener("click", async () => {
            const form = document.getElementById("cropForm");
            const overview = document.getElementById("cropActivityOverview");
            const list = document.getElementById("cropListSection");
            if (form) form.style.display = "none";
            if (overview) overview.style.display = "none";
            if (list) {
                list.style.setProperty("display", "block", "important");
                list.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            await loadCropList();
        });
    }

    if (activitiesButton) {
        activitiesButton.addEventListener("click", async () => {
            const list = document.getElementById("cropListSection");
            list?.classList.remove("crop-list-open");
            list?.style.setProperty("display", "none", "important");
            const overview = document.getElementById("cropActivityOverview");
            if (overview) { overview.classList.add("crop-overview-open"); overview.style.display = "block"; overview.scrollIntoView({ behavior: "smooth", block: "start" }); }
            await loadCropActivityOverview();
        });
    }

    if (overviewAddButton) {
        overviewAddButton.addEventListener("click", async () => {
                const form = document.getElementById("cropActivityForm");
            if (!form) return;
            form.style.display = "block";
            document.getElementById("activityCropName").textContent = "Choose the crop this activity belongs to.";
            await populateCropActivitySelector(currentCropId);
            document.getElementById("activityDate").value = new Date().toISOString().split("T")[0];
            form.scrollIntoView({ behavior: "smooth" });
        });
    }

    loadCropActivityOverview();
}

async function loadCropActivityOverview() {
    const list = document.getElementById("cropActivityOverviewList");
    if (!list) return;

    try {
        const [activities, crops] = await Promise.all([
            getAllRecords("cropActivities"),
            getAllRecords("crops")
        ]);
        const cropMap = new Map(crops.map(crop => [crop.id, crop]));
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent = activities.slice(0, 12);

        if (!recent.length) {
            list.innerHTML = '<p class="empty-message">No crop activities recorded yet.</p>';
            return;
        }

        list.innerHTML = recent.map(activity => {
            const crop = cropMap.get(activity.cropId);
            return `
                <div class="activity-card activity-overview-card">
                    <div>
                        <strong>🌱 ${crop ? crop.cropName : "Crop"} — ${activity.type}</strong>
                        <p>📅 ${activity.date}</p>
                        ${activity.quantity > 0 ? `<p>📦 ${activity.quantity} ${activity.unit || ""}</p>` : ""}
                        ${activity.notes ? `<p>📝 ${activity.notes}</p>` : ""}
                    </div>
                    ${crop ? `<button type="button" class="small-button activity-open-crop" data-crop-id="${crop.id}">Open Crop</button>` : ""}
                </div>
            `;
        }).join("");
        list.querySelectorAll(".activity-open-crop").forEach(button => {
            button.addEventListener("click", () => viewCrop(Number(button.dataset.cropId)));
        });
    } catch (error) {
        console.error("Could not load crop activity overview:", error);
        list.innerHTML = '<p class="empty-message">Could not load crop activities.</p>';
    }
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
        const navButton = document.querySelector('.bottom-nav-item[data-nav="animals"]');
        if (navButton) { navButton.click(); return; }
        poultrySection.style.display = "block";
    });


    // Egg Production belongs to Animals, so Back must return to the
    // Animal workspace — never the Finance workspace.
    backButton?.addEventListener("click", () => {
        const nav = document.getElementById("bottomNav");
        nav?.querySelectorAll(".bottom-nav-item").forEach(item => {
            item.classList.toggle("active", item.dataset.nav === "animals");
        });

        document.body.classList.add("navigation-active");
        document.body.dataset.navigation = "animals";
        hideAllNavigationPanels();

        const animal = document.getElementById("animalWorkspace");
        const poultry = document.getElementById("poultrySection");
        const list = document.getElementById("animalListCard");
        const finance = document.getElementById("animalFinanceSummary");
        const form = document.getElementById("animalForm");

        if (poultry) {
            poultry.classList.remove("poultry-open");
            poultry.style.display = "none";
        }
        if (animal) animal.style.display = "block";
        if (list) list.style.display = "none";
        if (finance) finance.style.display = "none";
        if (form) form.style.display = "none";

        animal?.scrollIntoView({ behavior: "smooth", block: "start" });
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

async function setupFinanceWorkspace() {
    const financeWorkspace = document.getElementById("financeWorkspace");
    const expenseSection = document.getElementById("farmExpenseSection");
    const labourSection = document.getElementById("farmLabourSection");
    const salesSection = document.getElementById("farmSalesSection");
    if (!financeWorkspace) return;

    const hideDetails = () => {
        [expenseSection, labourSection, salesSection].forEach(el => { if (el) el.style.display = "none"; });
        financeWorkspace.style.display = "block";
    };
    const openDetails = async (section, loader, dateSetter) => {
        financeWorkspace.style.display = "none";
        [expenseSection, labourSection, salesSection].forEach(el => { if (el) el.style.display = "none"; });
        if (section) section.style.display = "block";
        if (dateSetter) dateSetter();
        if (loader) await loader();
        section?.scrollIntoView({behavior:"smooth", block:"start"});
    };

    document.getElementById("financeExpensesButton")?.addEventListener("click", () => openDetails(expenseSection, loadExpenseHistory));
    document.getElementById("financeLabourButton")?.addEventListener("click", () => openDetails(labourSection, loadLabourHistory, setLabourDate));
    document.getElementById("financeSalesButton")?.addEventListener("click", () => openDetails(salesSection, loadSalesHistory, setSalesDate));
    document.getElementById("financeRecentButton")?.addEventListener("click", () => document.getElementById("financeRecentCard")?.scrollIntoView({behavior:"smooth", block:"start"}));
    document.getElementById("financeRefreshButton")?.addEventListener("click", refreshFinanceDashboard);

    document.getElementById("farmExpenseButton")?.addEventListener("click", hideDetails);
    document.getElementById("farmLabourBackButton")?.addEventListener("click", hideDetails);
    document.getElementById("farmSalesBackButton")?.addEventListener("click", hideDetails);

    await refreshFinanceDashboard();
}

async function refreshFinanceDashboard() {
    try {
        const [expenses, labour, sales] = await Promise.all([
            getAllRecords("expenses"), getAllRecords("labour"), getAllRecords("sales")
        ]);
        const expenseTotal = expenses.reduce((n,r)=>n+Number(r.amount||0),0) + labour.reduce((n,r)=>n+Number(r.cost||0),0);
        const salesTotal = sales.reduce((n,r)=>n+Number(r.amount||0),0);
        const profit = salesTotal - expenseTotal;
        const fmt = n => `₦${Number(n).toLocaleString("en-NG")}`;
        const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
        set("financeExpenseTotal",fmt(expenseTotal));
        set("financeSalesTotal",fmt(salesTotal));
        set("financeProfitTotal",fmt(profit));
        applyFinancialTone(document.getElementById("financeProfitTotal"), profit);
        const financeProfitLabel = document.querySelector('#financeProfitTotal')?.parentElement?.querySelector('small');
        if (financeProfitLabel) financeProfitLabel.textContent = profit < 0 ? "Loss" : "Profit";

        const rows = [
            ...expenses.map(r=>({date:r.date, icon:"💸", title:r.description||r.category||"Expense", amount:-Number(r.amount||0), type:"Expense"})),
            ...labour.map(r=>({date:r.date, icon:"👷", title:r.type||"Labour", amount:-Number(r.cost||0), type:"Labour"})),
            ...sales.map(r=>({date:r.date, icon:"💵", title:r.product||"Sale", amount:Number(r.amount||0), type:"Sale"}))
        ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
        const list=document.getElementById("financeRecentList");
        if (!list) return;
        list.innerHTML = rows.length ? rows.map(r=>`<div class="finance-transaction"><span class="finance-transaction-icon">${r.icon}</span><div><strong>${r.title}</strong><small>${r.date} · ${r.type}</small></div><b class="${r.amount<0?'finance-out':'finance-in'}">${r.amount<0?'−':'+'}${fmt(Math.abs(r.amount))}</b></div>`).join("") : '<p class="empty-message">No financial records yet.</p>';
    } catch(error) { console.error("Could not refresh finance dashboard:",error); }
}

function setupExpenseNavigation() {
    const expenseButton = document.getElementById("expenseButton");
    const expenseSection = document.getElementById("farmExpenseSection");
    const backButton = document.getElementById("farmExpenseButton");

    // Home/legacy expense shortcut opens the Finance workspace.
    expenseButton?.addEventListener("click", () => {
        const navButton = document.querySelector('.bottom-nav-item[data-nav="finance"]');
        if (navButton) { navButton.click(); return; }
        if (expenseSection) expenseSection.style.display = "block";
    });

    // Expense detail always returns to Finance — never Animals.
    backButton?.addEventListener("click", () => {
        const workspace = document.getElementById("financeWorkspace");
        if (expenseSection) expenseSection.style.display = "none";
        if (workspace) {
            workspace.style.display = "block";
            workspace.scrollIntoView({behavior:"smooth", block:"start"});
        }
        refreshFinanceDashboard();
    });
}
function setupReminderNavigation(){ const button=document.getElementById("remindersButton"),section=document.getElementById("remindersSection"),back=document.getElementById("remindersBackButton"); button?.addEventListener("click",async()=>{showMorePanel("reminders");await populateReminderTargets();await loadReminders();}); back?.addEventListener("click",()=>showMorePanel("menu")); }
async function populateReminderTargets(){ const s=document.getElementById("reminderTarget");if(!s)return;const[crops,animals]=await Promise.all([getAllRecords("crops"),getAllRecords("animals")]);s.innerHTML='<option value="">🌾 General farm</option>'+crops.map(c=>`<option value="crop:${c.id}">🌱 ${escapeHtml(c.cropName||"Crop")}${c.plot?` — ${escapeHtml(c.plot)}`:""}</option>`).join("")+animals.map(a=>`<option value="animal:${a.id}">🐄 ${escapeHtml(a.type||"Animal")}${a.breed?` — ${escapeHtml(a.breed)}`:""}</option>`).join(""); }
function reminderDueLabel(r){const d=new Date(`${r.dueDate}T${r.dueTime||"00:00"}`);const now=new Date();const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());const day=new Date(d.getFullYear(),d.getMonth(),d.getDate());const diff=Math.round((day-today)/86400000);if(diff===0)return r.dueTime?`Today at ${r.dueTime}`:"Today";if(diff===1)return r.dueTime?`Tomorrow at ${r.dueTime}`:"Tomorrow";if(diff>1&&diff<7)return d.toLocaleDateString("en-NG",{weekday:"long"})+(r.dueTime?` at ${r.dueTime}`:"");return d.toLocaleDateString("en-NG",{day:"numeric",month:"long",year:"numeric"})+(r.dueTime?` at ${r.dueTime}`:"");}
async function requestFarmKeeperNotifications(){
    if(!('Notification' in window)) { alert('This browser does not support notifications.'); return 'unsupported'; }
    if(!window.isSecureContext) { alert('Notifications require HTTPS (or localhost).'); return 'insecure'; }
    try { return await Notification.requestPermission(); } catch(e) { console.warn('Notification permission request failed', e); return 'denied'; }
}
async function showFarmKeeperNotification(title, body){
    try {
        if(!('Notification' in window) || Notification.permission !== 'granted') return false;
        const registration = await navigator.serviceWorker?.ready;
        if(registration?.showNotification){
            await registration.showNotification(title, {body, icon:'./icons/icon-192.png', badge:'./icons/icon-192.png', tag:'farmkeeper-reminder'});
            return true;
        }
        new Notification(title, {body});
        return true;
    } catch(e){ console.warn('Could not show notification', e); return false; }
}
async function saveReminder(){
    const title=document.getElementById("reminderTitle")?.value.trim(),date=document.getElementById("reminderDueDate")?.value,time=document.getElementById("reminderDueTime")?.value||"",repeat=document.getElementById("reminderRepeat")?.value||"none",target=document.getElementById("reminderTarget")?.value||"",notes=document.getElementById("reminderNotes")?.value.trim()||"",notify=document.getElementById("reminderNotify")?.checked!==false;
    if(!title||!date){alert("Please enter a reminder and due date.");return;}
    try{
        if(notify){
            const permission=await requestFarmKeeperNotifications();
            if(permission!=='granted') { document.getElementById("reminderNotify").checked=false; alert('Reminder saved, but device notifications are not enabled. Please allow notifications for FarmKeeper in your browser.'); }
        }
        await addRecord("reminders",{type:"task",title,dueDate:date,dueTime:time,repeat,target,notes,notify:notify&&('Notification' in window)&&Notification.permission==='granted',completed:false,createdAt:new Date().toISOString()});
        ["reminderTitle","reminderDueDate","reminderDueTime","reminderNotes"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
        document.getElementById("reminderRepeat").value="none"; document.getElementById("reminderTarget").value="";
        await loadReminders(); checkTaskReminders();
        alert("✅ Reminder saved successfully!");
    }catch(e){console.error(e);alert("❌ Could not save reminder.");}
}

async function completeReminder(id){
    const rs=await getAllRecords("reminders"),r=rs.find(x=>Number(x.id)===Number(id)); if(!r)return;
    r.completed=true; r.completedAt=new Date().toISOString(); await updateRecord("reminders",r);
    if(r.repeat&&r.repeat!=="none"){
        const next=new Date(`${r.dueDate}T${r.dueTime||"09:00"}`);
        if(r.repeat==="daily") next.setDate(next.getDate()+1);
        if(r.repeat==="weekly") next.setDate(next.getDate()+7);
        if(r.repeat==="monthly") next.setMonth(next.getMonth()+1);
        await addRecord("reminders",{type:"task",title:r.title,dueDate:next.toISOString().split("T")[0],dueTime:r.dueTime||"",repeat:r.repeat,target:r.target||"",notes:r.notes||"",notify:r.notify!==false,completed:false,createdAt:new Date().toISOString()});
    }
    await loadReminders();
}
async function deleteReminder(id){if(!confirm("Delete this reminder?"))return;await deleteRecord("reminders",Number(id));await loadReminders();}
function setupReminderForm(){document.getElementById("saveReminderButton")?.addEventListener("click",saveReminder);updateReminderStatus();}
async function loadReminders(){const list=document.getElementById("reminderList");if(!list)return;try{const rs=(await getAllRecords("reminders")).filter(r=>r.type!=="dailyRecord");rs.sort((a,b)=>new Date(`${a.completed?"9999-12-31":a.dueDate}T${a.dueTime||"00:00"}`)-new Date(`${b.completed?"9999-12-31":b.dueDate}T${b.dueTime||"00:00"}`));if(!rs.length){list.innerHTML='<p class="empty-message">No reminders yet.</p>';return;}list.innerHTML=rs.map(r=>`<article class="reminder-task-card ${r.completed?"completed":""}"><div><strong>${r.completed?"✅":"🔔"} ${escapeHtml(r.title)}</strong><p>${reminderDueLabel(r)}${r.repeat&&r.repeat!=="none"?` · ${escapeHtml(r.repeat)}`:""}</p>${r.notes?`<p>${escapeHtml(r.notes)}</p>`:""}</div><div class="reminder-actions">${r.completed?"":`<button type="button" class="small-button" onclick="completeReminder(${Number(r.id)})">✓ Done</button>`}<button type="button" class="small-button danger-button" onclick="deleteReminder(${Number(r.id)})">🗑️ Delete</button></div></article>`).join("");await updateReminderStatus();}catch(e){console.error(e);}}
async function updateReminderStatus(){const s=document.getElementById("reminderStatus");if(!s)return;try{const rs=(await getAllRecords("reminders")).filter(r=>r.type==="task"&&!r.completed);const daily=(await getAllRecords("reminders")).find(r=>r.type==="dailyRecord"&&r.enabled);s.innerHTML=`<h3>🔔 Reminder Status</h3><p>🟢 ${rs.length} active farm task${rs.length===1?"":"s"}.</p>${daily?`<p>📝 Daily record reminder: ${escapeHtml(daily.time)}</p>`:""}`;}catch(e){s.innerHTML='<p>⚠️ Could not load reminder status.</p>';}}
async function checkTaskReminders(){
    try{
        const rs=await getAllRecords("reminders"),now=new Date();
        for(const r of rs.filter(x=>x.type==="task"&&!x.completed)){
            const due=new Date(`${r.dueDate}T${r.dueTime||"09:00"}`);
            if(now>=due){
                const key=`fk-reminder-shown-${r.id}-${r.dueDate}`;
                if(r.notify && !localStorage.getItem(key)){
                    const shown=await showFarmKeeperNotification("🔔 FarmKeeper Reminder", r.title);
                    if(!shown) console.warn('Notification could not be displayed. Permission:', ('Notification' in window ? Notification.permission : 'unsupported'));
                    localStorage.setItem(key,"1");
                }
            }
        }
    }catch(e){console.warn("Could not check task reminders",e);}
}
function setupReminderNotificationButton(){
    const btn=document.getElementById('enableReminderNotifications');
    const status=document.getElementById('reminderNotificationStatus');
    const refresh=()=>{
        if(!status)return;
        if(!('Notification' in window)) status.textContent='⚠️ Notifications are not supported by this browser.';
        else if(Notification.permission==='granted') status.textContent='✅ Device notifications are enabled.';
        else if(Notification.permission==='denied') status.textContent='🚫 Notifications are blocked. Allow them in your browser site settings.';
        else status.textContent='🔔 Device notifications are not enabled yet.';
    };
    btn?.addEventListener('click',async()=>{await requestFarmKeeperNotifications();refresh();if(Notification.permission==='granted') await showFarmKeeperNotification('FarmKeeper','Notifications are working!');});
    refresh();
}
setInterval(checkTaskReminders,30000);
window.addEventListener('focus',checkTaskReminders);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkTaskReminders();});

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

        linkedEntity: getFinanceEntitySelection("farmExpenseCrop"),

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

            linkedEntity: getFinanceEntitySelection("farmExpenseCrop"),

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
        await refreshFinanceDashboard();


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

            const navButton = document.querySelector('.bottom-nav-item[data-nav="more"]');
            if (navButton) { navButton.click(); showMorePanel("reports"); return; }
            reportsSection.style.display = "block";

        }
    );


    backButton?.addEventListener("click", () => {
        const nav = document.getElementById("bottomNav");
        nav?.querySelectorAll(".bottom-nav-item").forEach(item => {
            item.classList.toggle("active", item.dataset.nav === "more");
        });
        document.body.classList.add("navigation-active");
        document.body.dataset.navigation = "more";
        if (reportsSection) reportsSection.style.setProperty("display", "none", "important");
        const moreMenu = document.getElementById("moreMenu");
        if (moreMenu) moreMenu.style.setProperty("display", "block", "important");
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

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

        const animals =
            await getAllRecords("animals");

        const crops =
            await getAllRecords("crops");


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

        // General farm asset summaries
        const filteredAnimals = animals.filter(a => {
            const date = a.dateAcquired || a.createdAt?.slice(0, 10);
            return !startDate || (date && new Date(date + "T00:00:00") >= startDate && new Date(date + "T00:00:00") <= now);
        });

        const filteredCrops = crops.filter(c => {
            const date = c.plantingDate || c.createdAt?.slice(0, 10);
            return !startDate || (date && new Date(date + "T00:00:00") >= startDate && new Date(date + "T00:00:00") <= now);
        });

        const animalHeadCount = filteredAnimals.reduce((sum, a) => sum + Number(a.count || 0), 0);
        const animalTypeSummary = filteredAnimals.reduce((map, a) => {
            const type = a.type || "Other";
            map[type] = (map[type] || 0) + Number(a.count || 0);
            return map;
        }, {});
        const animalTypeLines = Object.entries(animalTypeSummary)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 8)
            .map(([type, count]) => `<div class="report-item"><span>${type}</span><strong>${count}</strong></div>`)
            .join("");


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
                    🐄 Animal Summary
                </h3>

                <div class="report-item">
                    <span>Animal Groups</span>
                    <strong>${filteredAnimals.length}</strong>
                </div>

                <div class="report-item">
                    <span>Total Animals</span>
                    <strong>${animalHeadCount}</strong>
                </div>

                ${animalTypeLines || '<p class="empty-message">No animal records in this period.</p>'}

            </div>


            <div class="report-card">

                <h3>
                    🌱 Crop Summary
                </h3>

                <div class="report-item">
                    <span>Crop Records</span>
                    <strong>${filteredCrops.length}</strong>
                </div>

                <div class="report-item">
                    <span>Crop Activities</span>
                    <strong>${filteredActivities.length}</strong>
                </div>

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
                        📈 ${netProfit < 0 ? "Loss" : "Net Profit"}
                    </span>

                    <strong class="${netProfit < 0 ? "financial-negative" : netProfit > 0 ? "financial-positive" : "financial-neutral"}">
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

        const expenseEntitySelect = document.getElementById("farmExpenseCrop");
        if (expenseEntitySelect) {
            expenseEntitySelect.value = expense.linkedEntity || "";
        }


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

    backButton.addEventListener("click", () => {
        document.getElementById("farmSalesSection").style.display = "none";
        document.getElementById("financeWorkspace").style.display = "block";
        refreshFinanceDashboard();
        document.getElementById("financeWorkspace").scrollIntoView({behavior:"smooth", block:"start"});
    });


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

        linkedEntity: getFinanceEntitySelection("farmLabourCrop"),

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
        await populateFinanceEntitySelectors();
        await updateFinancialSummary();
        await refreshFinanceDashboard();


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

        const labourEntitySelect = document.getElementById("farmLabourCrop");
        if (labourEntitySelect) {
            labourEntitySelect.value = record.linkedEntity || "";
        }


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


    // Back to Finance dashboard
    backButton?.addEventListener("click", () => {
        const workspace = document.getElementById("financeWorkspace");
        const section = document.getElementById("farmSalesSection");
        if (section) section.style.display = "none";
        if (workspace) {
            workspace.style.display = "block";
            workspace.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        refreshFinanceDashboard();
    });


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

        linkedEntity: getFinanceEntitySelection("farmSalesCrop"),

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
        await populateFinanceEntitySelectors();
        await updateFinancialSummary();
        await refreshFinanceDashboard();


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

        const salesEntitySelect = document.getElementById("farmSalesCrop");
        if (salesEntitySelect) {
            salesEntitySelect.value = sale.linkedEntity || "";
        }


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

        // Sales deletion is isolated to the sales ledger.
        // It never deletes or edits crop, animal, labour, expense, or daily records.



        alert(
            "🗑️ Sale deleted successfully."
        );


        await loadSalesHistory();
        await updateFinancialSummary();
        await refreshFinanceDashboard();


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

function applyFinancialTone(element, value) {
    if (!element) return;
    const numericValue = Number(value) || 0;
    element.classList.remove("financial-positive", "financial-negative", "financial-neutral");
    element.classList.add(
        numericValue < 0 ? "financial-negative" :
        numericValue > 0 ? "financial-positive" :
        "financial-neutral"
    );
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


        const dashboardProfit = document.getElementById("dashboardProfit");
        const dashboardProfitLabel = document.querySelector('#summary .summary-card:has(#dashboardProfit) h3');
        if (dashboardProfit) {
            dashboardProfit.textContent = `₦${netProfit.toLocaleString("en-NG")}`;
            applyFinancialTone(dashboardProfit, netProfit);
        }
        if (dashboardProfitLabel) dashboardProfitLabel.textContent = netProfit < 0 ? "Loss" : "Profit";


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

function closeDailyHistory() {
    const historySection = document.getElementById("dailyHistorySection");
    const form = document.getElementById("dailyForm");
    const moreMenu = document.getElementById("moreMenu");

    // Clear every navigation panel first so no older CSS/handler can reopen
    // the history section immediately after it is hidden.
    hideAllNavigationPanels();

    if (form) form.style.setProperty("display", "none", "important");
    if (historySection) historySection.style.setProperty("display", "none", "important");
    if (moreMenu) moreMenu.style.setProperty("display", "block", "important");

    document.body.classList.add("navigation-active");
    document.body.dataset.navigation = "more";

    const nav = document.getElementById("bottomNav");
    nav?.querySelectorAll(".bottom-nav-item").forEach(item => {
        item.classList.toggle("active", item.dataset.nav === "more");
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupDailyHistoryNavigation() {
    const viewButton = document.getElementById("viewDailyHistoryButton");
    const hideButton = document.getElementById("hideDailyHistoryButton");
    const historySection = document.getElementById("dailyHistorySection");

    if (viewButton) {
        viewButton.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const form = document.getElementById("dailyForm");
            if (form) form.style.setProperty("display", "none", "important");
            if (historySection) {
                historySection.style.setProperty("display", "block", "important");
                await loadDailyRecordsHistory();
                historySection.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        };
    }

    if (hideButton) {
        // Use one authoritative handler. This also works if older app code
        // or browser state has attached a competing history handler.
        hideButton.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            closeDailyHistory();
        };
    }

    // Defensive event delegation: if the button is recreated dynamically,
    // the X button still closes the history workspace.
    if (!window.__farmKeeperDailyHistoryDelegation) {
        document.addEventListener("click", (event) => {
            const target = event.target?.closest?.("#hideDailyHistoryButton");
            if (!target) return;
            event.preventDefault();
            event.stopPropagation();
            closeDailyHistory();
        }, true);
        window.__farmKeeperDailyHistoryDelegation = true;
    }
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

async function setupUserProfile() {

    const profileSetupCard =
        document.getElementById("profileSetupCard");

    const saveProfileButton =
        document.getElementById("saveProfileButton");

    if (!profileSetupCard || !saveProfileButton) {
        console.warn(
            "Profile setup elements not found."
        );
        return;
    }

    // Always attach the Continue button handler.
    // This prevents a database read error from leaving the button inactive.
    saveProfileButton.onclick = saveUserProfile;

    let existingProfile = null;

    try {
        existingProfile = await getSettings();
    } catch (error) {
        console.warn(
            "Could not read profile from IndexedDB. Checking backup.",
            error
        );

        try {
            const backup =
                localStorage.getItem("farmKeeperProfile");

            existingProfile =
                backup ? JSON.parse(backup) : null;
        } catch (backupError) {
            console.warn(
                "Could not read profile backup:",
                backupError
            );
        }
    }

    if (existingProfile && existingProfile.setupCompleted) {

        farmKeeperProfile =
            existingProfile;

        profileSetupCard.style.display =
            "none";

        updateWelcomeMessage();

        return;
    }

    profileSetupCard.style.display =
        "block";
}

async function saveUserProfile() {

    const userName =
        document
            .getElementById("userName")
            .value
            .trim();

    const farmName =
        document
            .getElementById("farmName")
            .value
            .trim();

    const selectedPreference =
        document.querySelector(
            'input[name="welcomePreference"]:checked'
        );

    const welcomePreference =
        selectedPreference
            ? selectedPreference.value
            : "name";

    if (!userName && !farmName) {

        alert(
            "Please enter your name or farm name."
        );

        return;
    }

    const profile = {

        id: "profile",

        userName: userName,

        farmName: farmName,

        welcomePreference:
            welcomePreference,

        setupCompleted: true,

        updatedAt:
            new Date().toISOString()

    };

    try {

        // Save a local backup immediately so setup does not reappear
        // even if IndexedDB is temporarily unavailable.
        localStorage.setItem(
            "farmKeeperProfile",
            JSON.stringify(profile)
        );

        // Save to IndexedDB as the main persistent storage.
        await saveSettings(profile);

        farmKeeperProfile =
            profile;

        document.getElementById(
            "profileSetupCard"
        ).style.display = "none";

        updateWelcomeMessage();

        // Keep the user on the Home page after setup.
        showNavigationSection("home");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        alert(
            "✅ Your FarmKeeper profile has been saved."
        );

    } catch (error) {

        console.error(
            "Could not save FarmKeeper profile:",
            error
        );

        // The local backup was already saved, so allow the user to continue.
        farmKeeperProfile = profile;

        document.getElementById(
            "profileSetupCard"
        ).style.display = "none";

        updateWelcomeMessage();

        showNavigationSection("home");

        alert(
            "⚠️ Your profile was saved on this device, but the database needs to be refreshed."
        );

    }

}

function updateWelcomeMessage() {

    const title =
        document.getElementById(
            "welcomeTitle"
        );

    const subtitle =
        document.getElementById(
            "welcomeSubtitle"
        );


    if (!title || !subtitle) {
        return;
    }


    if (!farmKeeperProfile) {
        return;
    }


    const {
        userName,
        farmName,
        welcomePreference
    } = farmKeeperProfile;


    let greeting = "";


    if (
        welcomePreference === "farm" &&
        farmName
    ) {

        greeting =
            `Welcome back to ${farmName} 🌱`;

    }

    else if (
        welcomePreference === "both" &&
        userName &&
        farmName
    ) {

        greeting =
            `Good day, ${userName} 👋`;

        subtitle.textContent =
            `Welcome back to ${farmName}.`;

    }

    else if (userName) {

        greeting =
            `Good day, ${userName} 👋`;

    }

    else if (farmName) {

        greeting =
            `Welcome back to ${farmName} 🌱`;

    }


    title.textContent =
        greeting;


    if (
        welcomePreference !== "both"
    ) {

        subtitle.textContent =
            "Keep track of your farm activities, expenses, crops and livestock.";

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

/* =========================================
   FARM PROFILE EDITOR
   ========================================= */
function setupProfileEditor() {

    const openButton = document.getElementById("openProfileEditorButton");
    const closeButton = document.getElementById("closeProfileEditorButton");
    const saveButton = document.getElementById("updateProfileButton");
    const card = document.getElementById("profileEditorCard");

    if (!openButton || !closeButton || !saveButton || !card) {
        console.warn("Profile editor elements not found.");
        return;
    }

    openButton.addEventListener("click", openProfileEditor);
    closeButton.addEventListener("click", closeProfileEditor);
    saveButton.addEventListener("click", saveEditedProfile);
}

async function openProfileEditor() {
    const card = document.getElementById("profileEditorCard");
    const moreMenu = document.getElementById("moreMenu");

    if (!card) return;

    try {
        // The Vercel deployment has a different IndexedDB origin from the
        // old GitHub Pages site, so a profile may not exist yet. Do not
        // silently return in that case: the Farm Profile editor should
        // still open and let the user create/save a profile.
        let profile = await getSettings();

        if (!profile) {
            try {
                const backup = localStorage.getItem("farmKeeperProfile");
                profile = backup ? JSON.parse(backup) : null;
            } catch (backupError) {
                console.warn("Could not read profile backup:", backupError);
            }
        }

        profile = profile || {
            userName: "",
            farmName: "",
            welcomePreference: "name"
        };

        document.getElementById("editUserName").value = profile.userName || "";
        document.getElementById("editFarmName").value = profile.farmName || "";

        const preference = profile.welcomePreference || "name";
        const radio = document.querySelector(
            `input[name="editWelcomePreference"][value="${preference}"]`
        );
        if (radio) radio.checked = true;

        if (moreMenu) moreMenu.style.display = "none";
        card.style.display = "block";
        card.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        console.error("Could not open profile editor:", error);
        alert("❌ Could not open your profile.");
    }
}

function closeProfileEditor() {
    const card = document.getElementById("profileEditorCard");
    if (card) card.style.display = "none";

    const nav = document.getElementById("bottomNav");
    if (nav) {
        nav.querySelectorAll(".bottom-nav-item").forEach(item => {
            item.classList.toggle("active", item.dataset.nav === "more");
        });
    }

    showNavigationSection("more");
}

async function saveEditedProfile() {
    const userName = document.getElementById("editUserName").value.trim();
    const farmName = document.getElementById("editFarmName").value.trim();
    const selected = document.querySelector(
        'input[name="editWelcomePreference"]:checked'
    );

    if (!userName && !farmName) {
        alert("Please enter your name or farm name.");
        return;
    }

    const welcomePreference = selected ? selected.value : "name";

    const profile = {
        id: "profile",
        userName,
        farmName,
        welcomePreference,
        setupCompleted: true,
        updatedAt: new Date().toISOString()
    };

    try {
        await saveSettings(profile);
        farmKeeperProfile = profile;
        updateWelcomeMessage();
        closeProfileEditor();
        alert("✅ Your FarmKeeper profile has been updated.");
    } catch (error) {
        console.error("Could not update FarmKeeper profile:", error);
        alert("❌ Could not update your profile.");
    }
}


/* =========================================
   LEGACY FINANCE DATA MIGRATION
   ========================================= */
async function migrateLegacyFinanceRecords() {
    try {
        const dailyRecords = await getAllRecords("dailyRecords");
        if (!dailyRecords.length) return;

        const [existingLabour, existingSales] = await Promise.all([
            getAllRecords("labour"),
            getAllRecords("sales")
        ]);

        const labourSources = new Set(
            existingLabour
                .filter(r => r.sourceDailyRecordId != null)
                .map(r => String(r.sourceDailyRecordId))
        );
        const salesSources = new Set(
            existingSales
                .filter(r => r.sourceDailyRecordId != null)
                .map(r => `${r.sourceDailyRecordId}:${r.product}`)
        );

        for (const daily of dailyRecords) {
            const labour = daily.labour || {};
            const labourHasData = Number(labour.cost || 0) > 0 || Number(labour.workers || 0) > 0;
            if (labourHasData && !labourSources.has(String(daily.id))) {
                await addRecord("labour", {
                    date: daily.date || new Date().toISOString().split("T")[0],
                    workers: Number(labour.workers || 0),
                    type: "Daily farm work",
                    linkedEntity: null,
                    cost: Number(labour.cost || 0),
                    notes: daily.notes ? `Migrated from daily record. ${daily.notes}` : "Migrated from an earlier daily farm record.",
                    sourceDailyRecordId: daily.id,
                    createdAt: daily.createdAt || new Date().toISOString()
                });
            }

            const sales = daily.sales || {};
            const eggsSold = Number(sales.eggsSold || 0);
            const eggSales = Number(sales.eggSales || 0);
            const vegetableSales = Number(sales.vegetableSales || 0);

            if (eggSales > 0 && !salesSources.has(`${daily.id}:Eggs`)) {
                await addRecord("sales", {
                    date: daily.date || new Date().toISOString().split("T")[0],
                    product: "Eggs",
                    linkedEntity: null,
                    quantity: eggsSold > 0 ? eggsSold : 1,
                    unit: eggsSold > 0 ? "Pieces" : "Other",
                    amount: eggSales,
                    customer: "",
                    notes: daily.notes ? `Migrated from daily record. ${daily.notes}` : "Migrated from an earlier daily farm record.",
                    sourceDailyRecordId: daily.id,
                    createdAt: daily.createdAt || new Date().toISOString()
                });
            }

            if (vegetableSales > 0 && !salesSources.has(`${daily.id}:Vegetables`)) {
                await addRecord("sales", {
                    date: daily.date || new Date().toISOString().split("T")[0],
                    product: "Vegetables",
                    linkedEntity: null,
                    quantity: 1,
                    unit: "Other",
                    amount: vegetableSales,
                    customer: "",
                    notes: daily.notes ? `Migrated from daily record. ${daily.notes}` : "Migrated from an earlier daily farm record.",
                    sourceDailyRecordId: daily.id,
                    createdAt: daily.createdAt || new Date().toISOString()
                });
            }
        }

        console.log("✅ Legacy finance records checked/migrated.");
    } catch (error) {
        console.warn("Could not migrate legacy finance records:", error);
    }
}

/* =========================================
   CROP / ANIMAL FINANCE LINKING
   ========================================= */
async function populateFinanceEntitySelectors() {
    const [crops, animals] = await Promise.all([getAllRecords("crops"), getAllRecords("animals")]);
    ["farmExpenseCrop","farmLabourCrop","farmSalesCrop"].forEach(id => {
        const select=document.getElementById(id); if(!select) return;
        const current=select.value;
        select.innerHTML='<option value="">General farm</option>';
        if(crops.length){ const g=document.createElement("optgroup"); g.label="🌱 Crops"; crops.forEach(c=>{const o=document.createElement("option");o.value=`crop:${c.id}`;o.textContent=c.cropName+(c.variety?` — ${c.variety}`:"");g.appendChild(o);});select.appendChild(g);}
        if(animals.length){ const g=document.createElement("optgroup"); g.label="🐾 Animals"; animals.forEach(a=>{const o=document.createElement("option");o.value=`animal:${a.id}`;o.textContent=`${a.type} — ${a.breed||"Group"}`;g.appendChild(o);});select.appendChild(g);}
        if(current) select.value=current;
    });
}
function getFinanceEntitySelection(id){
    const value=document.getElementById(id)?.value||""; if(!value) return null;
    const [kind, rawId]=value.split(":"); return {kind, id:Number(rawId)};
}
function setFinanceEntitySelection(id, entity){
    const select=document.getElementById(id); if(!select||!entity) return; select.value=`${entity.kind}:${entity.id}`;
}

async function setupAnimalWorkspace(){
    const add=document.getElementById("addAnimalButton");
    const form=document.getElementById("animalForm");
    const save=document.getElementById("saveAnimalButton");
    if(!add||!form||!save) return;

    const openForm=()=>{
        form.style.display="block";
        const date=document.getElementById("animalDate");
        if(date && !date.value) date.value=new Date().toISOString().split("T")[0];
        form.scrollIntoView({behavior:"smooth", block:"start"});
    };

    add.addEventListener("click", ()=>{ resetAnimalForm(); openForm(); });
    save.addEventListener("click", saveAnimalGroup);

    const cancelEdit=document.getElementById("cancelAnimalEditButton");
    if(cancelEdit) cancelEdit.addEventListener("click", ()=>{ resetAnimalForm(); form.style.display="none"; });

    const close=document.getElementById("closeAnimalFormButton");
    if(close) close.addEventListener("click",()=>{ form.style.display="none"; });

    const eggButton=document.getElementById("animalEggButton");
    if(eggButton) eggButton.addEventListener("click",()=>openPoultryWorkspace());

    const listButton=document.getElementById("animalListButton");
    if(listButton) listButton.addEventListener("click",()=>{
        const list=document.getElementById("animalListCard");
        if(list) {
            list.style.display="block";
            list.scrollIntoView({behavior:"smooth", block:"start"});
        }
    });

    const financeButton=document.getElementById("animalFinanceButton");
    if(financeButton) financeButton.addEventListener("click",()=>{
        const finance=document.getElementById("animalFinanceSummary");
        if(finance) {
            finance.style.display="block";
            finance.scrollIntoView({behavior:"smooth", block:"start"});
        }
    });

    // These are secondary views; keep them collapsed until their buttons are tapped.
    const list=document.getElementById("animalListCard");
    const finance=document.getElementById("animalFinanceSummary");
    if(list) list.style.display="none";
    if(finance) finance.style.display="none";

    await loadAnimalGroups();
}

function openPoultryWorkspace(){
    const poultry=document.getElementById("poultrySection");
    const animal=document.getElementById("animalWorkspace");
    if(animal) animal.style.display="none";
    if(poultry){
        poultry.classList.add("poultry-open");
        poultry.style.display="block";
        poultry.scrollIntoView({behavior:"smooth", block:"start"});
    }
}
let editingAnimalId = null;

function resetAnimalForm(){
    editingAnimalId = null;
    const form=document.getElementById("animalForm");
    const title=document.getElementById("animalFormTitle");
    const save=document.getElementById("saveAnimalButton");
    const cancel=document.getElementById("cancelAnimalEditButton");
    if(title) title.textContent="Add Animal Group";
    if(save) save.textContent="💾 Save Animal Group";
    if(cancel) cancel.style.display="none";
    ["animalType","animalBreed","animalCount","animalDate","animalNotes"].forEach(id=>{const el=document.getElementById(id); if(el) el.value="";});
}

async function editAnimalGroup(id){
    const animals=await getAllRecords("animals");
    const animal=animals.find(a=>Number(a.id)===Number(id));
    if(!animal) return;
    editingAnimalId=animal.id;
    document.getElementById("animalType").value=animal.type||"";
    document.getElementById("animalBreed").value=animal.breed||"";
    document.getElementById("animalCount").value=animal.count??"";
    document.getElementById("animalDate").value=animal.dateAcquired||"";
    document.getElementById("animalNotes").value=animal.notes||"";
    document.getElementById("animalFormTitle").textContent="Edit Animal Group";
    document.getElementById("saveAnimalButton").textContent="💾 Update Animal Group";
    document.getElementById("cancelAnimalEditButton").style.display="inline-flex";
    document.getElementById("animalForm").style.display="block";
    document.getElementById("animalForm").scrollIntoView({behavior:"smooth",block:"start"});
}

async function deleteAnimalGroup(id){
    const animals=await getAllRecords("animals");
    const animal=animals.find(a=>Number(a.id)===Number(id));
    if(!animal) return;
    if(!confirm(`Delete ${animal.type}${animal.breed?` (${animal.breed})`:""}?\n\nThis removes only the animal group. Linked Finance records will remain in Finance.`)) return;
    try{
        await deleteRecord("animals", animal.id);
        await loadAnimalGroups();
        await populateFinanceEntitySelectors();
        alert("🗑️ Animal group deleted.");
    }catch(e){ console.error(e); alert("❌ Could not delete animal group."); }
}

async function saveAnimalGroup(){
    const record={type:document.getElementById("animalType").value,breed:document.getElementById("animalBreed").value.trim(),count:Number(document.getElementById("animalCount").value)||0,dateAcquired:document.getElementById("animalDate").value,notes:document.getElementById("animalNotes").value.trim(),createdAt:new Date().toISOString()};
    if(!record.type||!record.count||!record.dateAcquired){alert("Please complete animal type, number and date acquired.");return;}
    try{
        if(editingAnimalId!==null){
            record.id=editingAnimalId;
            const animals=await getAllRecords("animals");
            const old=animals.find(a=>Number(a.id)===Number(editingAnimalId));
            record.createdAt=old?.createdAt||record.createdAt;
            await updateRecord("animals",record);
        }else{
            await addRecord("animals",record);
        }
        const wasEditing = editingAnimalId !== null;
        document.getElementById("animalForm").style.display="none";
        resetAnimalForm();
        await loadAnimalGroups();
        await populateFinanceEntitySelectors();
        alert(wasEditing?"✅ Animal group updated successfully!":"✅ Animal group saved successfully!");
    }catch(e){console.error(e);alert(editingAnimalId!==null?"❌ Could not update animal group.":"❌ Could not save animal group.");}
}
async function loadAnimalGroups(){
    const list=document.getElementById("animalList"); if(!list) return;
    const animals=await getAllRecords("animals");
    if(!animals.length){list.innerHTML='<p class="empty-message">No animal groups recorded yet.</p>';return;}
    const [expenses,labour,sales]=await Promise.all([getAllRecords("expenses"),getAllRecords("labour"),getAllRecords("sales")]);
    list.innerHTML=animals.map(a=>{const cost=expenses.filter(x=>x.linkedEntity?.kind==="animal"&&Number(x.linkedEntity.id)===Number(a.id)).reduce((n,x)=>n+Number(x.amount||0),0)+labour.filter(x=>x.linkedEntity?.kind==="animal"&&Number(x.linkedEntity.id)===Number(a.id)).reduce((n,x)=>n+Number(x.cost||0),0);const revenue=sales.filter(x=>x.linkedEntity?.kind==="animal"&&Number(x.linkedEntity.id)===Number(a.id)).reduce((n,x)=>n+Number(x.amount||0),0);return `<div class="animal-card"><div class="animal-card-heading"><h4>🐾 ${a.type}</h4><div class="animal-card-actions"><button type="button" class="small-button" onclick="editAnimalGroup(${Number(a.id)})">✏️ Edit</button><button type="button" class="small-button danger-button" onclick="deleteAnimalGroup(${Number(a.id)})">🗑️ Delete</button></div></div><p><strong>Breed:</strong> ${a.breed||"Not specified"}</p><p><strong>Count:</strong> ${a.count}</p><p><strong>Acquired:</strong> ${a.dateAcquired}</p><div class="animal-finance-mini"><span>Costs ₦${cost.toLocaleString("en-NG")}</span><span>Sales ₦${revenue.toLocaleString("en-NG")}</span><strong class="${(revenue-cost)<0?'financial-negative':(revenue-cost)>0?'financial-positive':'financial-neutral'}">${(revenue-cost)<0?'Loss':'Profit'} ₦${(revenue-cost).toLocaleString("en-NG")}</strong></div>${a.notes?`<p>📝 ${a.notes}</p>`:""}<div class="animal-photos-inline" id="animalPhotos-${Number(a.id)}"><small>📷 Loading photos...</small></div></div>`;}).join("");
    await Promise.all(animals.map(async a => { try { renderEntityPhotos(document.getElementById(`animalPhotos-${Number(a.id)}`), await getPhotosForTarget(`animal:${a.id}`)); } catch(e) { console.warn("Could not load animal photos", e); } }));
    const totalCost=animals.reduce((n,a)=>n+expenses.filter(x=>x.linkedEntity?.kind==="animal"&&Number(x.linkedEntity.id)===Number(a.id)).reduce((z,x)=>z+Number(x.amount||0),0)+labour.filter(x=>x.linkedEntity?.kind==="animal"&&Number(x.linkedEntity.id)===Number(a.id)).reduce((z,x)=>z+Number(x.cost||0),0),0);
    const totalRevenue=animals.reduce((n,a)=>n+sales.filter(x=>x.linkedEntity?.kind==="animal"&&Number(x.linkedEntity.id)===Number(a.id)).reduce((z,x)=>z+Number(x.amount||0),0),0);
    const animalProfit = totalRevenue - totalCost;
    document.getElementById("animalFinanceSummaryContent").innerHTML=`<div class="crop-performance-grid"><div><strong>₦${totalCost.toLocaleString("en-NG")}</strong><span>Costs</span></div><div><strong>₦${totalRevenue.toLocaleString("en-NG")}</strong><span>Sales</span></div><div><strong class="${animalProfit<0?'financial-negative':animalProfit>0?'financial-positive':'financial-neutral'}">₦${animalProfit.toLocaleString("en-NG")}</strong><span>${animalProfit<0?'Loss':'Profit'}</span></div></div>`;
}

/* =========================================
   MOBILE BOTTOM NAVIGATION
   The first screen is a full-app landing page.
   Once a navigation item is chosen, the app switches
   to a focused workspace.
   ========================================= */
function setupBottomNavigation() {
    const nav = document.getElementById("bottomNav");
    if (!nav) return;

    document.getElementById("homeCropsGlance")?.addEventListener("click", () => document.querySelector('.bottom-nav-item[data-nav="crops"]')?.click());
    document.getElementById("homeAnimalsGlance")?.addEventListener("click", () => document.querySelector('.bottom-nav-item[data-nav="animals"]')?.click());
    document.getElementById("homeRecordsGlance")?.addEventListener("click", () => {
        document.querySelector('.bottom-nav-item[data-nav="more"]')?.click();
        showMorePanel("daily");
    });

    nav.querySelectorAll(".bottom-nav-item").forEach(button => {
        button.addEventListener("click", async () => {
            const destination = button.dataset.nav;

            nav.querySelectorAll(".bottom-nav-item").forEach(item => {
                item.classList.toggle("active", item === button);
            });

            // Home is the complete dashboard shown in the approved Home design.
            // Selecting Home must always restore the full Home landing page,
            // including the financial cards, farm overview, search, reminders,
            // quick actions and Farm Records cards.
            if (destination === "home") {
                document.body.classList.add("navigation-active");
                await returnToHomeLanding();
                return;
            }

            document.body.classList.add("navigation-active");
            await showNavigationSection(destination);
        });
    });

    const closeMore = document.getElementById("closeMoreButton");
    if (closeMore) {
        closeMore.addEventListener("click", resetNavigationToLanding);
    }

    const moreDaily = document.getElementById("moreDailyButton");
    if (moreDaily) moreDaily.addEventListener("click", () => {
        openDailyRecordWorkspace();
    });

    const moreVisit = document.getElementById("moreVisitButton");
    if (moreVisit) moreVisit.addEventListener("click", async () => {
        showMorePanel("visit");
        setCurrentDateTime();
        await loadVisitHistory();
    });

    const moreReports = document.getElementById("moreReportsButton");
    if (moreReports) moreReports.addEventListener("click", () => {
        showMorePanel("reports");
    });

    const moreReminders = document.getElementById("moreRemindersButton");
    if (moreReminders) moreReminders.addEventListener("click", async () => {
        showMorePanel("reminders");
        await populateReminderTargets();
        await loadReminders();
    });

    // Home quick actions open the focused Daily Records workspace directly.
    const dailyHistoryHomeButton = document.getElementById("dailyHistoryHomeButton");
    if (dailyHistoryHomeButton) {
        dailyHistoryHomeButton.addEventListener("click", () => {
            const nav = document.getElementById("bottomNav");
            nav?.querySelectorAll(".bottom-nav-item").forEach(item => {
                item.classList.toggle("active", item.dataset.nav === "more");
            });
            document.body.classList.add("navigation-active");
            document.body.dataset.navigation = "more";
            hideAllNavigationPanels();
            const moreMenu = document.getElementById("moreMenu");
            if (moreMenu) moreMenu.style.display = "block";
            const history = document.getElementById("dailyHistorySection");
            const form = document.getElementById("dailyForm");
            if (form) form.style.display = "none";
            if (history) {
                history.style.display = "block";
                loadDailyRecordsHistory();
                history.scrollIntoView({behavior:"smooth", block:"start"});
            }
        });
    }

    // Start on the complete Home landing page with no nav item active.
    document.body.removeAttribute("data-navigation");
    showFullAppLanding();
}

function getNavigationSections() {
    return {
        // Home is the complete dashboard/landing page shown in the user's design.
        home: "landing",

        // Crops = crop records, crop list/details and crop activities only.
        crops: [
            "cropWorkspaceIntro",
            "cropForm",
            "cropListSection",
            "cropDetailsSection",
            "cropActivityForm",
            "cropActivityOverview"
        ],

        // Animals = poultry/flock and egg production only.
        animals: [
            "animalWorkspace",
            "poultrySection"
        ],

        // Finance = expenses, labour and sales/income only.
        finance: [
            "financeWorkspace",
            "farmExpenseSection",
            "farmLabourSection",
            "farmSalesSection"
        ],

        // More = the additional feature menu only.
        more: [
            "moreMenu"
        ]
    };
}

function getAllNavigationPanels() {
    return [
        "welcomeCard",
        "profileSetupCard",
        "summary",
        "dashboardLastVisit",
        "homeAtAGlance",
        "homeSearchCard",
        "homeRemindersCard",
        "quick-actions",
        "cropWorkspaceIntro",
        "cropForm",
        "cropListSection",
        "cropDetailsSection",
        "cropActivityForm",
        "cropActivityOverview",
        "animalWorkspace",
        "poultrySection",
        "financeWorkspace",
        "farmExpenseSection",
        "farmLabourSection",
        "farmSalesSection",
        "visitForm",
        "dailyForm",
        "dailyHistorySection",
        "reportsSection",
        "remindersSection",
        "farmSearchSection",
        "farmPhotosSection",
        "profileEditorCard",
        "backupRestoreSection",
        "moreMenu",
        "modules"
    ];
}

function getLandingPanels() {
    // Home is intentionally a dashboard, not a full crop workspace.
    // Crop management lives under the Crops bottom-navigation tab.
    return [
        "welcomeCard",
        "summary",
        "dashboardLastVisit",
        "homeAtAGlance",
        "homeSearchCard",
        "homeRemindersCard",
        "quick-actions",
        "modules"
    ];
}

function getElementByNavigationId(id) {
    return document.getElementById(id) || document.querySelector("." + id);
}

function hideAllNavigationPanels() {
    getAllNavigationPanels().forEach(id => {
        const element = getElementByNavigationId(id);
        if (element) element.style.display = "none";
    });
}

async function refreshHomeAtAGlance() {
    try {
        const [crops, animals, dailyRecords] = await Promise.all([
            getAllRecords("crops"),
            getAllRecords("animals"),
            getAllRecords("dailyRecords")
        ]);
        const today = new Date().toISOString().split("T")[0];
        const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
        set("homeCropCount", crops.length);
        set("homeAnimalCount", animals.length);
        set("homeTodayRecordCount", dailyRecords.filter(r => r.date === today).length);
        set("homeTodayDate", new Date().toLocaleDateString("en-NG", {day:"numeric", month:"short", year:"numeric"}));
        await refreshHomeReminders();
    } catch (error) {
        console.warn("Could not refresh Home overview:", error);
    }
}

async function refreshHomeReminders() {
    const list = document.getElementById("homeReminderList");
    if (!list) return;
    try {
        const reminders = (await getAllRecords("reminders"))
            .filter(r => r.type === "task" && !r.completed)
            .sort((a,b) => new Date(`${a.dueDate}T${a.dueTime||"09:00"}`) - new Date(`${b.dueDate}T${b.dueTime||"09:00"}`));
        if (!reminders.length) {
            list.innerHTML = `<div class="home-empty-reminders"><span>🌤️</span><div><strong>No reminders set</strong><small>Add tasks, vaccinations, harvest dates or weekly farm jobs.</small></div><button type="button" class="home-reminder-add" id="homeAddReminderButton">＋ Add</button></div>`;
            document.getElementById("homeAddReminderButton")?.addEventListener("click", openHomeReminders);
            return;
        }
        list.innerHTML = reminders.slice(0,4).map(r => `<button type="button" class="home-reminder-row" data-reminder-id="${Number(r.id)}"><span class="home-reminder-bell">🔔</span><span class="home-reminder-copy"><strong>${escapeHtml(r.title)}</strong><small>${escapeHtml(reminderDueLabel(r))}</small></span><span class="home-reminder-arrow">›</span></button>`).join("");
        list.querySelectorAll(".home-reminder-row").forEach(btn => btn.addEventListener("click", openHomeReminders));
    } catch (e) {
        console.warn("Could not refresh Home reminders:", e);
        list.innerHTML = '<p class="home-search-hint">Could not load reminders.</p>';
    }
}

function openHomeReminders() {
    document.querySelector('.bottom-nav-item[data-nav="more"]')?.click();
    setTimeout(async () => {
        showMorePanel("reminders");
        await populateReminderTargets();
        await loadReminders();
    }, 0);
}

function showFullAppLanding() {
    hideAllNavigationPanels();

    getLandingPanels().forEach(id => {
        const element = getElementByNavigationId(id);
        if (element) element.style.display = "block";
    });

    refreshHomeAtAGlance();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetNavigationToLanding() {
    const nav = document.getElementById("bottomNav");
    if (nav) {
        nav.querySelectorAll(".bottom-nav-item").forEach(item => {
            item.classList.remove("active");
        });
    }

    document.body.classList.remove("navigation-active");
    document.body.removeAttribute("data-navigation");
    showFullAppLanding();
}

async function returnToHomeLanding() {
    const nav = document.getElementById("bottomNav");
    if (nav) {
        nav.querySelectorAll(".bottom-nav-item").forEach(item => {
            item.classList.toggle("active", item.dataset.nav === "home");
        });
    }

    document.body.classList.add("navigation-active");
    document.body.dataset.navigation = "home";
    showFullAppLanding();
}

async function showNavigationSection(destination) {
    const sections = getNavigationSections();

    if (sections[destination] === "landing") {
        document.body.dataset.navigation = "home";
        showFullAppLanding();
        return;
    }

    hideAllNavigationPanels();
    document.body.dataset.navigation = destination;

    const ids = sections[destination] || [];
    ids.forEach(id => {
        const element = getElementByNavigationId(id);
        if (element) element.style.display = "block";
    });

    // A workspace should never inherit Home dashboard cards.
    ["summary", "dashboardLastVisit", "homeAtAGlance", "quick-actions", "welcomeCard", "modules"].forEach(id => {
        const element = getElementByNavigationId(id);
        if (element) element.style.display = "none";
    });

    // Crops opens as a workspace: overview + crop list + recent activities.
    if (destination === "crops") {
        const form = document.getElementById("cropForm");
        const details = document.getElementById("cropDetailsSection");
        const activity = document.getElementById("cropActivityForm");
        const list = document.getElementById("cropListSection");
        const overview = document.getElementById("cropActivityOverview");
        if (form) form.style.display = "none";
        if (details) details.style.display = "none";
        if (activity) activity.style.display = "none";
        if (list) { list.classList.remove("crop-list-open"); list.style.display = "none"; }
        if (overview) { overview.classList.remove("crop-overview-open"); overview.style.display = "none"; }
        document.body.classList.remove("crop-form-open");
        form?.classList.remove("crop-form-open");
        populateFinanceEntitySelectors();
    }

    if (destination === "finance") {
        const workspace = document.getElementById("financeWorkspace");
        const expense = document.getElementById("farmExpenseSection");
        const labour = document.getElementById("farmLabourSection");
        const sales = document.getElementById("farmSalesSection");
        [expense, labour, sales].forEach(el => { if (el) el.style.display = "none"; });
        if (workspace) workspace.style.display = "block";
        await populateFinanceEntitySelectors();
        await Promise.all([loadExpenseHistory(), loadLabourHistory(), loadSalesHistory(), refreshFinanceDashboard()]);
    }

    if (destination === "animals") {
        const animal = document.getElementById("animalWorkspace");
        const poultry = document.getElementById("poultrySection");
        const list = document.getElementById("animalListCard");
        const finance = document.getElementById("animalFinanceSummary");
        const form = document.getElementById("animalForm");
        if (animal) animal.style.display = "block";
        if (poultry) { poultry.classList.remove("poultry-open"); poultry.style.display = "none"; }
        if (list) list.style.display = "none";
        if (finance) finance.style.display = "none";
        if (form) form.style.display = "none";
        loadAnimalGroups();
        populateFinanceEntitySelectors();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeNavigationPanels() {
    resetNavigationToLanding();
}



/* =========================================
   PHASE 2 — USEFUL FARM TOOLS
   Reminders, visits, reports, search and photos.
   ========================================= */

/* =========================================
   BACKUP & RESTORE
   Exports/imports every FarmKeeper IndexedDB store.
   This is intentionally local: no farm data is uploaded anywhere.
   ========================================= */
const FARMKEEPER_BACKUP_VERSION = 1;
const FARMKEEPER_BACKUP_STORES = [
    "farm",
    "dailyRecords",
    "cropActivities",
    "crops",
    "eggRecords",
    "flock",
    "animals",
    "expenses",
    "labour",
    "sales",
    "visits",
    "reminders",
    "photos",
    "settings"
];

function setBackupStatus(message, isError = false) {
    const status = document.getElementById("backupStatus");
    if (!status) return;
    status.textContent = message || "";
    status.style.color = isError ? "#c62828" : "";
}

function formatBackupDate(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, "-").replace(/Z$/, "");
}

function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function createFarmKeeperBackup() {
    const stores = {};

    for (const storeName of FARMKEEPER_BACKUP_STORES) {
        stores[storeName] = await getAllRecords(storeName);
    }

    let profileBackup = null;
    try {
        const raw = localStorage.getItem("farmKeeperProfile");
        profileBackup = raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn("Could not read profile backup for export:", error);
    }

    return {
        app: "FarmKeeper",
        backupVersion: FARMKEEPER_BACKUP_VERSION,
        databaseName: typeof DB_NAME !== "undefined" ? DB_NAME : "FarmKeeperDB",
        databaseVersion: typeof DB_VERSION !== "undefined" ? DB_VERSION : 10,
        createdAt: new Date().toISOString(),
        stores,
        localStorage: {
            farmKeeperProfile: profileBackup
        }
    };
}

async function exportFarmKeeperBackup() {
    const button = document.getElementById("exportBackupButton");
    if (button) button.disabled = true;
    setBackupStatus("Preparing your backup…");

    try {
        const backup = await createFarmKeeperBackup();
        const json = JSON.stringify(backup, null, 2);
        const totalRecords = FARMKEEPER_BACKUP_STORES.reduce(
            (total, storeName) => total + (backup.stores[storeName]?.length || 0),
            0
        );

        downloadTextFile(
            `FarmKeeper-backup-${formatBackupDate()}.json`,
            json
        );

        setBackupStatus(`✅ Backup exported successfully — ${totalRecords} records included.`);
    } catch (error) {
        console.error("FarmKeeper backup export failed:", error);
        setBackupStatus("❌ Backup could not be exported. Please try again.", true);
    } finally {
        if (button) button.disabled = false;
    }
}

function isValidFarmKeeperBackup(backup) {
    if (!backup || typeof backup !== "object") return false;
    if (backup.app !== "FarmKeeper") return false;
    if (!backup.stores || typeof backup.stores !== "object") return false;
    return FARMKEEPER_BACKUP_STORES.every(storeName =>
        Array.isArray(backup.stores[storeName])
    );
}

function restoreFarmKeeperBackup(backup) {
    return new Promise((resolve, reject) => {
        let transaction;

        try {
            transaction = db.transaction(FARMKEEPER_BACKUP_STORES, "readwrite");
        } catch (error) {
            reject(error);
            return;
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Restore transaction failed."));
        transaction.onabort = () => reject(transaction.error || new Error("Restore transaction was aborted."));

        FARMKEEPER_BACKUP_STORES.forEach(storeName => {
            const store = transaction.objectStore(storeName);
            store.clear();
            backup.stores[storeName].forEach(record => {
                store.put(record);
            });
        });
    });
}

async function importFarmKeeperBackup(file) {
    if (!file) return;

    setBackupStatus("Reading backup file…");

    try {
        const text = await file.text();
        let backup;

        try {
            backup = JSON.parse(text);
        } catch (error) {
            throw new Error("The selected file is not valid JSON.");
        }

        if (!isValidFarmKeeperBackup(backup)) {
            throw new Error("This does not appear to be a valid FarmKeeper backup.");
        }

        const totalRecords = FARMKEEPER_BACKUP_STORES.reduce(
            (total, storeName) => total + backup.stores[storeName].length,
            0
        );

        const confirmed = confirm(
            `Restore this FarmKeeper backup?\n\n` +
            `${totalRecords} records will be restored.\n\n` +
            `This replaces the records currently stored on THIS website/device.\n\n` +
            `Your old backup file will not be changed.`
        );

        if (!confirmed) {
            setBackupStatus("Restore cancelled. Your current data was not changed.");
            return;
        }

        await restoreFarmKeeperBackup(backup);

        // Restore the profile backup as well, when present.
        const profile = backup.localStorage?.farmKeeperProfile;
        if (profile) {
            localStorage.setItem("farmKeeperProfile", JSON.stringify(profile));
            farmKeeperProfile = profile;
        }

        setBackupStatus(`✅ Restore complete — ${totalRecords} records imported.`);
        alert("✅ FarmKeeper backup restored successfully. The page will now refresh to load your records.");
        window.location.reload();
    } catch (error) {
        console.error("FarmKeeper backup import failed:", error);
        setBackupStatus(`❌ ${error.message || "Backup could not be restored."}`, true);
        alert(`❌ ${error.message || "Backup could not be restored."}`);
    }
}

function setupBackupRestore() {
    const openButton = document.getElementById("moreBackupButton");
    const backButton = document.getElementById("backupRestoreBackButton");
    const exportButton = document.getElementById("exportBackupButton");
    const importButton = document.getElementById("importBackupButton");
    const fileInput = document.getElementById("backupFileInput");

    openButton?.addEventListener("click", () => showMorePanel("backup"));
    backButton?.addEventListener("click", () => showMorePanel("menu"));
    exportButton?.addEventListener("click", exportFarmKeeperBackup);
    importButton?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", async event => {
        const file = event.target.files?.[0];
        await importFarmKeeperBackup(file);
        event.target.value = "";
    });
}

async function setupPhase2Features() {
    const visitBack = document.getElementById("visitBackButton");
    visitBack?.addEventListener("click", () => showMorePanel("menu"));

    const searchButton = document.getElementById("moreSearchButton");
    const photosButton = document.getElementById("morePhotosButton");
    const searchBack = document.getElementById("farmSearchBackButton");
    const photosBack = document.getElementById("farmPhotosBackButton");

    searchButton?.addEventListener("click", () => showMorePanel("search"));
    photosButton?.addEventListener("click", async () => {
        showMorePanel("photos");
        await populatePhotoTargets();
        await loadFarmPhotos();
    });
    searchBack?.addEventListener("click", () => showMorePanel("menu"));
    photosBack?.addEventListener("click", () => showMorePanel("menu"));

    document.getElementById("farmSearchInput")?.addEventListener("input", runFarmSearch);
    document.getElementById("saveFarmPhotoButton")?.addEventListener("click", saveFarmPhoto);

    // Backup & Restore lives under More and is intentionally initialized separately.

    // Make the More menu the true parent of Phase 2 screens.
    const oldShowMorePanel = window.showMorePanel;
}

function showMorePanel(panel, mode = null) {
    hideAllNavigationPanels();
    const moreMenu = document.getElementById("moreMenu");
    if (moreMenu) moreMenu.style.display = panel === "menu" ? "block" : "none";

    const targets = {
        visit: ["visitForm"], reports: ["reportsSection"], reminders: ["remindersSection"],
        profile: ["profileEditorCard"], search: ["farmSearchSection"], photos: ["farmPhotosSection"],
        backup: ["backupRestoreSection"]
    };
    if (panel === "daily") {
        const form = document.getElementById("dailyForm"), history = document.getElementById("dailyHistorySection");
        if (form) form.style.display = mode === "history" ? "none" : "block";
        if (history) history.style.display = mode === "history" ? "block" : "none";
        if (mode === "history") loadDailyRecordsHistory();
    } else if (targets[panel]) {
        targets[panel].forEach(id => { const el=document.getElementById(id); if(el) el.style.display="block"; });
        if (panel === "search") { const input=document.getElementById("farmSearchInput"); input?.focus(); }
        if (panel === "photos") loadFarmPhotos();
    }
    window.scrollTo({top:0,behavior:"smooth"});
}

async function populatePhotoTargets() {
    const select=document.getElementById("farmPhotoTarget"); if(!select) return;
    const [crops,animals,visits]=await Promise.all([getAllRecords("crops"),getAllRecords("animals"),getAllRecords("visits")]);
    select.innerHTML='<option value="general">🌾 General Farm</option>'+
        crops.map(c=>`<option value="crop:${c.id}">🌱 Crop: ${escapeHtml(c.cropName||"Crop")}${c.plot?` — ${escapeHtml(c.plot)}`:""}</option>`).join("")+ 
        animals.map(a=>`<option value="animal:${a.id}">🐄 Animal: ${escapeHtml(a.type||"Animal")}${a.breed?` — ${escapeHtml(a.breed)}`:""}</option>`).join("")+
        visits.map(v=>`<option value="visit:${v.id}">📍 Visit: ${escapeHtml(v.date)}${v.location?` — ${escapeHtml(v.location)}`:""}</option>`).join("");
}

async function getPhotosForTarget(target) {
    const photos = await getAllRecords("photos");
    return photos.filter(p => String(p.target || "general") === String(target)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}

function renderEntityPhotos(container, photos) {
    if (!container) return;
    if (!photos.length) { container.innerHTML = '<p class="empty-message">No photos attached to this record.</p>'; return; }
    container.innerHTML = photos.map(p => `<div class="entity-photo-item"><img src="${p.dataUrl}" alt="${escapeHtml(p.caption || "Farm photo")}" loading="lazy"><small>${escapeHtml(p.caption || "Farm photo")}</small></div>`).join("");
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
}

async function saveFarmPhoto() {
    const input=document.getElementById("farmPhotoInput"), file=input?.files?.[0];
    if(!file){ alert("Please choose a photo first."); return; }
    if(!file.type.startsWith("image/")){ alert("Please choose an image file."); return; }
    if(file.size > 5*1024*1024){ alert("Please choose an image smaller than 5 MB."); return; }
    const reader=new FileReader();
    reader.onload=async()=>{
        try {
            await addRecord("photos", { target:document.getElementById("farmPhotoTarget")?.value||"general", caption:document.getElementById("farmPhotoCaption")?.value.trim()||"", dataUrl:reader.result, createdAt:new Date().toISOString() });
            input.value=""; document.getElementById("farmPhotoCaption").value=""; await loadFarmPhotos(); alert("✅ Photo saved.");
        } catch(e){ console.error(e); alert("❌ Could not save photo."); }
    };
    reader.readAsDataURL(file);
}

async function loadFarmPhotos() {
    const grid=document.getElementById("farmPhotosGrid"); if(!grid) return;
    try {
        const photos=(await getAllRecords("photos")).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
        if(!photos.length){grid.innerHTML='<p class="empty-message">No farm photos yet.</p>';return;}
        grid.innerHTML=photos.map(p=>`<article class="farm-photo-card"><img src="${p.dataUrl}" alt="${escapeHtml(p.caption||"Farm photo")}" loading="lazy"><div><strong>${escapeHtml(p.caption||"Farm photo")}</strong><small>${new Date(p.createdAt).toLocaleDateString("en-NG")}</small></div><button type="button" class="small-button danger-button" onclick="deleteFarmPhoto(${Number(p.id)})">🗑️ Delete</button></article>`).join("");
    } catch(e){ console.error("Could not load farm photos",e); }
}
async function deleteFarmPhoto(id){ if(!confirm("Delete this photo?")) return; await deleteRecord("photos",Number(id)); await loadFarmPhotos(); }

async function performFarmSearch(q, out) {
    if(!out) return;
    if(q.length<2){out.innerHTML='<p class="home-search-hint">Type at least 2 characters to search.</p>';return;}
    const stores=["crops","animals","expenses","labour","sales","dailyRecords","visits","cropActivities"];
    const data=await Promise.all(stores.map(s=>getAllRecords(s)));
    const labels={crops:"🌱 Crop",animals:"🐄 Animal",expenses:"💸 Expense",labour:"👷 Labour",sales:"💵 Sale",dailyRecords:"📝 Daily Record",visits:"📍 Farm Visit",cropActivities:"📜 Crop Activity"};
    const rows=[];
    stores.forEach((store,i)=>data[i].forEach(r=>{ const text=JSON.stringify(r).toLowerCase(); if(text.includes(q)) rows.push({store,r}); }));
    if(!rows.length){out.innerHTML='<p class="home-search-hint">No matching farm records found.</p>';return;}
    out.innerHTML=`<div class="search-results-count">${rows.length} result${rows.length===1?"":"s"}</div>`+rows.slice(0,8).map(({store,r})=>{
        const title=r.cropName||r.type||r.category||r.product||r.workType||r.notes||"Farm record";
        const date=r.date||r.plantingDate||r.dateAcquired||r.createdAt?.slice(0,10)||"";
        return `<div class="home-search-result"><span class="home-search-result-type">${labels[store]}</span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(date)}</small></div>`;
    }).join("");
}

async function runFarmSearch() {
    const q=(document.getElementById("farmSearchInput")?.value||"").trim().toLowerCase();
    await performFarmSearch(q, document.getElementById("farmSearchResults"));
}

function setupHomeSearch() {
    const input=document.getElementById("homeSearchInput"), out=document.getElementById("homeSearchResults"), clear=document.getElementById("homeSearchClear");
    if(!input || !out) return;
    let timer;
    input.addEventListener("input",()=>{ clearTimeout(timer); timer=setTimeout(()=>performFarmSearch(input.value.trim().toLowerCase(),out),180); });
    clear?.addEventListener("click",()=>{input.value="";out.innerHTML='<p class="home-search-hint">Search your farm records without leaving Home.</p>';input.focus();});
}



async function buildFarmKeeperAIContext() {
    const stores = ["crops", "animals", "expenses", "sales", "labour", "dailyRecords", "visits", "cropActivities", "reminders"];
    const data = await Promise.all(stores.map(s => getAllRecords(s).catch(() => [])));
    const context = {};
    stores.forEach((store, i) => {
        context[store] = (data[i] || []).slice(-40).map(record => {
            const copy = { ...record };
            // Keep the AI context compact and never send stored photo data.
            delete copy.dataUrl;
            delete copy.image;
            delete copy.photo;
            return copy;
        });
    });
    if (farmKeeperProfile) {
        context.profile = {
            farmName: farmKeeperProfile.farmName || "",
            location: farmKeeperProfile.location || "",
            farmType: farmKeeperProfile.farmType || ""
        };
    }

    // Give FarmKeeper AI a compact, calculated snapshot so it can answer
    // questions about performance without relying on the model to guess totals.
    const expenses = context.expenses || [];
    const labour = context.labour || [];
    const sales = context.sales || [];
    const expenseTotal = expenses.reduce((n, r) => n + Number(r.amount || 0), 0);
    const labourTotal = labour.reduce((n, r) => n + Number(r.cost || r.amount || 0), 0);
    const salesTotal = sales.reduce((n, r) => n + Number(r.amount || 0), 0);
    context.calculated = {
        salesTotal,
        expenseTotal,
        labourTotal,
        totalCosts: expenseTotal + labourTotal,
        estimatedProfit: salesTotal - expenseTotal - labourTotal,
        cropCount: (context.crops || []).length,
        animalGroupCount: (context.animals || []).length,
        openReminderCount: (context.reminders || []).filter(r => !r.completed).length
    };
    return context;
}

function appendFarmKeeperAIMessage(role, text) {
    const chat = document.getElementById("homeAiChat");
    if (!chat) return;
    const message = document.createElement("div");
    message.className = `home-ai-message ${role}`;
    message.textContent = text;
    chat.appendChild(message);
    chat.scrollTop = chat.scrollHeight;
}

async function askFarmKeeperAI(question) {
    const input = document.getElementById("homeAiInput");
    const send = document.getElementById("homeAiSendButton");
    const status = document.getElementById("homeAiStatus");
    const clean = String(question || "").trim();
    if (!clean || send?.disabled) return;

    appendFarmKeeperAIMessage("user", clean);
    if (input) input.value = "";
    if (send) send.disabled = true;
    if (status) status.textContent = "FarmKeeper AI is checking your farm records…";

    try {
        const farmContext = await buildFarmKeeperAIContext();
        const response = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: clean, farmContext })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "AI request failed.");
        appendFarmKeeperAIMessage("assistant", data.answer || "I could not produce an answer.");
        if (status) status.textContent = "";
    } catch (error) {
        console.error("FarmKeeper AI error", error);
        appendFarmKeeperAIMessage("assistant", error.message || "FarmKeeper AI is temporarily unavailable.");
        if (status) status.textContent = "";
    } finally {
        if (send) send.disabled = false;
        input?.focus();
    }
}

function setupFarmKeeperAI() {
    const form = document.getElementById("homeAiForm");
    const input = document.getElementById("homeAiInput");
    if (!form || !input) return;
    form.addEventListener("submit", event => {
        event.preventDefault();
        askFarmKeeperAI(input.value);
    });
    document.querySelectorAll("[data-ai-question]").forEach(button => {
        button.addEventListener("click", () => askFarmKeeperAI(button.dataset.aiQuestion || ""));
    });
}
