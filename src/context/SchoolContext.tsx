import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const SchoolContext = createContext<any>(null);

export function SchoolProvider({ children }: any) {

  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    loadSchool();
  }, []);

  async function loadSchool() {

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("schools")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setSchoolId(data.id);
    }
  }

  return (
    <SchoolContext.Provider value={{ schoolId }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}