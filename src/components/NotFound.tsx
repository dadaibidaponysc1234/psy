import { FileText } from "lucide-react"

const NotFound = ({ searchTerm }: { searchTerm: string }) => {
  return (
    <div className="flex w-full flex-col items-center justify-center px-4 lg:mx-auto lg:mt-12 lg:max-w-7xl lg:px-8">
      <div className="flex flex-col items-center gap-4">
        <FileText size={64} />
        <p className="max-w-prose text-xl font-bold">
          Couldn&apos;t find the Study
        </p>
      </div>
      <div className="text-md font-meduim text-gray-900 dark:text-white">{`"${searchTerm}"`}</div>
    </div>
  )
}

export default NotFound
