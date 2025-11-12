export default function DashboardCards() {
  const cards = [
    { title: "Utilisateurs", value: 42 },
    { title: "Entités", value: 8 },
    { title: "Modules actifs", value: 5 },
    { title: "Partenaires", value: 24 },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c, i) => (
        <div
          key={i}
          className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition"
        >
          <h3 className="text-sm text-gray-500 mb-1">{c.title}</h3>
          <p className="text-2xl font-bold text-indigo-700">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
