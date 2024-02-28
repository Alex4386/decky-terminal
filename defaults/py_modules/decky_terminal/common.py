import asyncio
from typing import Callable, Dict, Optional, TypeVar

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
            data = await cls._run_async(f.read)
            f.close()
            return data
        except Exception as e:
            print('exception', e)
            return None

    @classmethod
    async def write_file(cls, filename: str, content: str) -> bool:
        try:
            f = await cls._run_async(open, filename, "w+")
            await cls._run_async(f.write, content)
            f.close()
            return True
        except Exception as e:
            print('exception', e)
            return False
        
    @classmethod
    def merge_dict(cls, prev: Dict[_T, _U], new: Dict[_T, _U]) -> Dict[_T, _U]:
        for i, v in new.items():
            if prev.get(i) is None:
                prev[i] = v
            else:
                if isinstance(prev.get(i), dict) and isinstance(v, dict):
                    prev[i] = cls.merge_dict(prev[i], new[i])
                else:
                    prev[i] = v
        
        return prev