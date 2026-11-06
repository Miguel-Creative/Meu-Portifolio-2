import {useEffect} from "react";
import {startScrollConstruction} from "@/lib/scrollConstruction";

/**
 * This controller changes only the reveal state of the original elements.
 * No replacement markup, opening screen or extension is used.
 */
export default function ScrollConstruction(){
  useEffect(()=>{
    const destroy=startScrollConstruction();
    return ()=>destroy();
  },[]);
  return null;
}
