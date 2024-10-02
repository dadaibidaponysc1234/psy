

const StudySkeleton = () => {
    return (
        <div className='w-full relative animate-pulse'>
            <div className="max-w-4xl space-y-1">
            <div className="bg-gray-200 dark:bg-white/30 backdrop-blur-lg h-6 w-64 rounded" />
            <div className="bg-gray-200 dark:bg-white/30 backdrop-blur-lg h-20 rounded" />
            <div className="bg-gray-200 dark:bg-white/30 backdrop-blur-lg h-5 w-32 rounded" />
            </div>
        </div>
    );
}

export default StudySkeleton;