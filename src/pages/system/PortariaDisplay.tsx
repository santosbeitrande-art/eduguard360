import { useEffect, useState } from "react";

const PortariaDisplay = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const last = localStorage.getItem("last_scan");
      if (last) {
        setData(JSON.parse(last));
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (!data) return <h1 style={{ padding: 40 }}>Aguardando leitura...</h1>;

  return (
    <div style={{ textAlign: "center", padding: 40 }}>
      <img src={data.photo} width={200} />
      <h1>{data.name}</h1>
      <h2>Turma: {data.classroom}</h2>

      <h1 style={{
        color: data.type === "entrada" ? "green" : "red",
        fontSize: 40
      }}>
        {data.type.toUpperCase()}
      </h1>
    </div>
  );
};

export default PortariaDisplay;
