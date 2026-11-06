import {useEffect} from "react";
import {startScrollConstruction} from "../lib/scrollConstruction";

/**
 * The controller reveals native elements; it never replaces the original page.
 */
export default function ScrollConstruction(){
  useEffect(()=>{
    const destroy=startScrollConstruction();
    return ()=>destroy();
  },[]);
  return null;
}
