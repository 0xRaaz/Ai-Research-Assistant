import chromadb
import os
import re

# Path where ChromaDB will store its data
CHROMA_PATH = "data/vector_db"

os.makedirs(CHROMA_PATH, exist_ok=True)


# Lazy initialization
client = None


def get_client():
    """
    Initialize ChromaDB only when required.
    """
    global client

    if client is None:
        client = chromadb.PersistentClient(
            path=CHROMA_PATH
        )

    return client



def get_or_create_collection(collection_name: str):
    """
    Get existing collection or create a new one.
    """

    sanitized_name = re.sub(
        r'[^a-zA-Z0-9_-]',
        '_',
        collection_name
    ).strip('_')

    if len(sanitized_name) < 3:
        sanitized_name = sanitized_name.ljust(3, '_')


    collection = get_client().get_or_create_collection(
        name=sanitized_name,
        metadata={
            "hnsw:space": "cosine"
        }
    )

    return collection



def store_embeddings(
    collection_name: str,
    chunks: list[str],
    embeddings: list[list[float]],
    filename: str
):
    """
    Store text chunks and embeddings into ChromaDB.
    """

    collection = get_or_create_collection(collection_name)


    ids = [
        f"{filename}_chunk_{i}"
        for i in range(len(chunks))
    ]


    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=[
            {
                "filename": filename,
                "chunk_index": i
            }
            for i in range(len(chunks))
        ]
    )


    return {
        "collection": collection_name,
        "stored_chunks": len(chunks),
        "filename": filename
    }



def retrieve_similar_chunks(
    collection_name: str,
    query_embedding: list[float],
    top_k: int = 5
):
    """
    Retrieve similar document chunks.
    """

    collection = get_or_create_collection(collection_name)


    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=[
            "documents",
            "distances",
            "metadatas"
        ]
    )


    chunks = []

    documents = results["documents"][0]
    distances = results["distances"][0]
    metadatas = results["metadatas"][0]


    for doc, distance, meta in zip(
        documents,
        distances,
        metadatas
    ):

        similarity_score = round(
            1 - distance,
            4
        )


        chunks.append(
            {
                "text": doc,
                "score": similarity_score,
                "chunk_index": meta.get(
                    "chunk_index",
                    -1
                ),
                "filename": meta.get(
                    "filename",
                    ""
                )
            }
        )


    return chunks



def get_collection_info(collection_name: str):

    collection = get_or_create_collection(
        collection_name
    )

    return {
        "collection_name": collection_name,
        "total_stored": collection.count()
    }
