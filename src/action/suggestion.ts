import axios from "axios";

export const getSuggestion = async (searchTerm: string) => {
    try { 

        const res = await axios.get(`https://algorithmxcomp.pythonanywhere.com/api/suggestions/?query=${searchTerm}`);
        return res.data;
        
    } catch (error) {
       return error;
    }
};