import { ChevronLeft, ChevronRight } from "lucide-react";


interface PaginationControlsProps {
    nextPage: () => void
    prevPage: () => void
    page: number
    count: number | undefined
    isLoading: boolean
}


const PaginationControls = ({ nextPage, prevPage, page, count, isLoading }: PaginationControlsProps) => {

    const totalPage = Math.ceil((count ?? 0) / 10);

    return (
        <div className="flex justify-center items-center gap-6">
            <button
                className="bg-green-700 text-white py-1 px-2 disabled:cursor-not-allowed disabled:opacity-70 rounded tracking-wide"
                onClick={prevPage}
                disabled={page === 1}
            >
                <div className="flex items-center">
                    <ChevronLeft className="w-5 h-5" />
                    <p className="font-medium">Previous</p>
                </div>
            </button>

            {isLoading ? (
                <div>Loading...</div>
            ) : (
                <div className="font-medium text-lg">
                    {page} / {totalPage}
                </div>
            )}

            <button
                className="bg-green-700 text-white py-1 px-2 disabled:cursor-not-allowed disabled:opacity-35 rounded tracking-wide"
                onClick={nextPage}
                disabled={page === totalPage}
            >
                <div className="flex items-center">
                    <p className="font-medium">Next</p>
                    <ChevronRight className="w-5 h-5" />
                </div>
            </button>

        </div>
    );
}

export default PaginationControls;