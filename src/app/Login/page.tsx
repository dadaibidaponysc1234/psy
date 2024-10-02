import axios from "axios";

const Login = async () => {

    const {data} = await axios.get('https://jsonplaceholder.typicode.com/postS/1' )
    return (
        <div>{JSON.stringify(data)}  </div>
     );
}
 
export default Login;