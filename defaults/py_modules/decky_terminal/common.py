import asyncio
from typing import List, Dict, Optional, TypeVar, Callable

# Why does the Python generic work this way?
_T = TypeVar("_T")
_U = TypeVar("_U")

class Common:
    @classmethod
    async def _run_async(cls, fun: Callable[..., _T], *args) -> _T:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, fun, *args)

    @classmethod
    async def read_file(cls, filename: str) -> Optional[str]:
        try:
            f = await cls._run_async(open, filename, "r")
            data = await cls._run_async(f.read, f)
            f.close()
            return data
        except:
            return None

    @classmethod
    async def write_file(cls, filename: str, content: str) -> bool:
        try:
            f = await cls._run_async(open, filename, "w")
            await cls._run_async(f.write, f, content)
            f.close()
            return True
        except:
            return False
        
    @classmethod
    async def merge_dict(cls, prev: Dict[_T, _U], new: Dict[_T, _U]) -> bool:
        for i, v in new:
            if prev.get(i) is None:
                prev[i] = v
            else:
                if type(prev.get(i)) is dict and type(v) is dict:
                    prev[i] = cls.merge_dict(prev[i], new[i])
                else:
                    prev[i] = v
        
        return prev