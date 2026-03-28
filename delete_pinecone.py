from pinecone import Pinecone

pc = Pinecone(api_key="pcsk_28r4Ge_BmSFxpNJk26WKRNU5M4UvXp6AP8MgJaSFtuBqdY8sfZTaXZHa39S1bkz9xGbg6X")

index = pc.Index("n8n1536")  # your index name

index.delete(delete_all=True)

print("Deleted successfully")
