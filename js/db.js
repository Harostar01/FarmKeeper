                                                                                                                              const DB_NAME = "FarmKeeperDB";
const DB_VERSION = 10;

let db;

// Open the FarmKeeper database
function openDatabase() {
    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {

            console.error(
                "FarmKeeper database error:",
                request.error
            );

            reject(
                request.error ||
                "Could not open FarmKeeper database."
            );

        };


        request.onblocked = () => {

            console.warn(
                "⚠️ FarmKeeper database upgrade is blocked. " +
                "Please close other FarmKeeper tabs."
            );

        };


        request.onsuccess = (event) => {

            db = event.target.result;


            // Close this connection if another tab
            // requests a database version upgrade.
            db.onversionchange = () => {

                console.log(
                    "FarmKeeper database version is changing. Closing connection."
                );

                db.close();

            };


            console.log(
                "FarmKeeper database opened successfully."
            );


            resolve(db);

};

        request.onupgradeneeded = (event) => {

            const database = event.target.result;

            // Farm information
            if (!database.objectStoreNames.contains("farm")) {
                database.createObjectStore("farm", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            // Daily farm records
            if (!database.objectStoreNames.contains("dailyRecords")) {
                database.createObjectStore("dailyRecords", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
             

            // Crop activity history
            if (!database.objectStoreNames.contains("cropActivities")) {
                database.createObjectStore("cropActivities", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }


            // Crop records
            if (!database.objectStoreNames.contains("crops")) {
                database.createObjectStore("crops", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            // Egg production records
            if (!database.objectStoreNames.contains("eggRecords")) {
                database.createObjectStore("eggRecords", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            // Poultry flock information
            if (!database.objectStoreNames.contains("flock")) {
                database.createObjectStore("flock", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            // Animal records
            if (!database.objectStoreNames.contains("animals")) {
                database.createObjectStore("animals", { keyPath: "id", autoIncrement: true });
            }

            // Expense records
            if (!database.objectStoreNames.contains("expenses")) {
                database.createObjectStore("expenses", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            // Labour records
            if (!database.objectStoreNames.contains("labour")) {
                database.createObjectStore("labour", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            // Sales records
            if (!database.objectStoreNames.contains("sales")) {
                database.createObjectStore("sales", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            // Farm visit records
            if (!database.objectStoreNames.contains("visits")) {
                database.createObjectStore("visits", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
            // Reminder settings
            if (!database.objectStoreNames.contains("reminders")) {
                database.createObjectStore("reminders", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
            // Farm photo records (crop, animal or general farm photos)
            if (!database.objectStoreNames.contains("photos")) {
                database.createObjectStore("photos", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            // User and farm personalization settings
            if (!database.objectStoreNames.contains("settings")) {
                database.createObjectStore("settings", {
                    keyPath: "id"
                });
            }


            console.log("FarmKeeper database structure created.");
        };
    });
}


// Save a record
function addRecord(storeName, record) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            "readwrite"
        );

        const store = transaction.objectStore(storeName);

        const request = store.add(record);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject("Could not save record.");
        };
    });
}


// Get all records from a store
function getAllRecords(storeName) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            "readonly"
        );

        const store = transaction.objectStore(storeName);

        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject("Could not retrieve records.");
        };
    });
}                                                              

function getRecordById(storeName, id) {

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                storeName,
                "readonly"
            );

        const store =
            transaction.objectStore(storeName);

        const request =
            store.get(id);


        request.onsuccess = () => {

            resolve(request.result);

        };


        request.onerror = () => {

            reject(request.error);

        };

    });

}


// Update an existing record
function updateRecord(storeName, record) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            "readwrite"
        );

        const store =
            transaction.objectStore(storeName);

        const request =
            store.put(record);

        request.onsuccess = () => {

            resolve(request.result);

        };

        request.onerror = () => {

            reject(request.error);

        };

    });

}


// Delete a record
function deleteRecord(storeName, id) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            "readwrite"
        );

        const store =
            transaction.objectStore(storeName);

        const request =
            store.delete(id);

        request.onsuccess = () => {

            resolve();

        };

        request.onerror = () => {

            reject(request.error);

        };

    });

}

// Save user/farm settings
function saveSettings(settings) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "settings",
            "readwrite"
        );

        const store =
            transaction.objectStore("settings");

        const request =
            store.put(settings);

        request.onsuccess = () => {
            try {
                localStorage.setItem(
                    "farmKeeperProfile",
                    JSON.stringify(settings)
                );
            } catch (error) {
                console.warn(
                    "Could not update profile backup:",
                    error
                );
            }

            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}


// Get user/farm settings
function getSettings() {

    return new Promise((resolve, reject) => {

        let transaction;

        try {
            transaction = db.transaction(
                "settings",
                "readonly"
            );
        } catch (error) {
            reject(error);
            return;
        }

        const store =
            transaction.objectStore("settings");

        const request =
            store.get("profile");

        request.onsuccess = () => {

            const profile = request.result;

            if (profile) {
                resolve(profile);
                return;
            }

            try {
                const backup =
                    localStorage.getItem(
                        "farmKeeperProfile"
                    );

                resolve(
                    backup
                        ? JSON.parse(backup)
                        : null
                );
            } catch (error) {
                resolve(null);
            }

        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}
