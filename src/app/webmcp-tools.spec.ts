import ard from '../../public/.well-known/ard.json';
import { WEBMCP_TOOLS } from './webmcp-tools';

describe('ARD manifest', () => {
  it('lists the registered WebMCP tools', () => {
    const names = WEBMCP_TOOLS.map((t) => t.name);
    const [entry] = ard.entries;
    expect(entry.capabilities).toEqual(names);
    expect(entry.data.tools).toEqual(names);
  });
});
