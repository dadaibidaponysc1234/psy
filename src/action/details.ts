import axios from "axios";

export const getDetails = async (id: number) => {
    try { 

        const res = await axios.get(`https://algorithmxcomp.pythonanywhere.com/api/studies/${id}`);
        
        return res.data;
        
    } catch (error) {
       return error;
    }
};
