import { useSelector } from 'react-redux'

const useFeatures = () => useSelector((state) => state.features)

export default useFeatures
