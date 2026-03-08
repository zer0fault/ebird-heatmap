export default function Legend() {
  return (
    <div className="absolute bottom-8 left-4 bg-black/70 text-white rounded p-3 text-xs pointer-events-none">
      <div className="mb-1 font-medium">Species Diversity</div>
      <div
        className="h-3 w-36 rounded"
        style={{
          background:
            'linear-gradient(to right, rgba(0,0,255,0.6), cyan, yellow, orange, red)',
        }}
      />
      <div className="flex justify-between mt-1">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}
