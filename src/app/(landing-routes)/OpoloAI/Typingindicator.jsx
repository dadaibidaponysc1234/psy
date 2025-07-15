const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-1 p-2">
      <div className="h-2 w-2 animate-bounce rounded-full bg-[#EE7527]"></div>
      <div
        className="h-2 w-2 animate-bounce rounded-full bg-[#EE7527]"
        style={{ animationDelay: "0.2s" }}
      ></div>
      <div
        className="h-2 w-2 animate-bounce rounded-full bg-[#EE7527]"
        style={{ animationDelay: "0.4s" }}
      ></div>
    </div>
  )
}
export default TypingIndicator
