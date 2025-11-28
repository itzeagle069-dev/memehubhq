import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export function useCategories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const catDoc = await getDoc(doc(db, "settings", "categories"));
                if (catDoc.exists()) {
                    setCategories(catDoc.data().list || []);
                } else {
                    // Default categories if not set
                    setCategories(["reaction", "trending", "animal", "work", "sports", "coding", "crypto", "gaming"]);
                }
            } catch (err) {
                console.error("Error fetching categories:", err);
                setCategories(["reaction", "trending", "animal", "work"]);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    return { categories, loading };
}
